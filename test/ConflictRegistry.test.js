const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ConflictRegistry", function () {
  let constitution;
  let conflictRegistry;
  let owner, citizensHouse, citizen1, citizen2, citizen3;

  beforeEach(async function () {
    [owner, citizensHouse, citizen1, citizen2, citizen3] = await ethers.getSigners();

    // Deploy Constitution
    const Constitution = await ethers.getContractFactory("Constitution");
    constitution = await Constitution.deploy();
    await constitution.waitForDeployment();

    // Deploy ConflictRegistry
    const ConflictRegistry = await ethers.getContractFactory("ConflictRegistry");
    conflictRegistry = await ConflictRegistry.deploy(await constitution.getAddress());
    await conflictRegistry.waitForDeployment();

    // Set Citizens' House
    await conflictRegistry.setCitizensHouse(citizensHouse.address);
  });

  describe("Deployment", function () {
    it("should set constitution correctly", async function () {
      expect(await conflictRegistry.constitution()).to.equal(await constitution.getAddress());
    });

    it("should set citizens house correctly", async function () {
      expect(await conflictRegistry.citizensHouse()).to.equal(citizensHouse.address);
    });

    it("should not allow setting citizens house twice", async function () {
      await expect(conflictRegistry.setCitizensHouse(citizen1.address)).to.be.revertedWith(
        "Already set"
      );
    });
  });

  describe("Conflict Disclosure", function () {
    it("should disclose conflict of interest", async function () {
      const projectId = 1;
      const conflictType = 0; // Founder
      const description = "Co-founder of project";
      const ipfsHash = "QmXxx";

      await conflictRegistry
        .connect(citizen1)
        .discloseConflict(projectId, conflictType, description, ipfsHash);

      const conflict = await conflictRegistry.getConflict(citizen1.address, projectId);
      expect(conflict.exists).to.equal(true);
      expect(conflict.citizen).to.equal(citizen1.address);
      expect(conflict.projectId).to.equal(projectId);
      expect(conflict.description).to.equal(description);
    });

    it("should emit ConflictDisclosed event", async function () {
      await expect(
        conflictRegistry.connect(citizen1).discloseConflict(1, 0, "Founder", "QmXxx")
      )
        .to.emit(conflictRegistry, "ConflictDisclosed")
        .withArgs(citizen1.address, 1, "Founder", "QmXxx");
    });

    it("should track project conflicts", async function () {
      await conflictRegistry.connect(citizen1).discloseConflict(1, 0, "Founder", "QmXxx");
      await conflictRegistry.connect(citizen2).discloseConflict(1, 1, "Employee", "QmYyy");

      const conflicts = await conflictRegistry.getProjectConflicts(1);
      expect(conflicts.length).to.equal(2);
      expect(conflicts[0]).to.equal(citizen1.address);
      expect(conflicts[1]).to.equal(citizen2.address);
    });

    it("should reject duplicate conflict disclosure", async function () {
      await conflictRegistry.connect(citizen1).discloseConflict(1, 0, "Founder", "QmXxx");

      await expect(
        conflictRegistry.connect(citizen1).discloseConflict(1, 1, "Also advisor", "QmYyy")
      ).to.be.revertedWithCustomError(conflictRegistry, "ConflictExists");
    });

    it("should allow disclosure of different conflict types", async function () {
      // Test all conflict types
      await conflictRegistry.connect(citizen1).discloseConflict(1, 0, "Founder", "Qm1"); // Founder
      await conflictRegistry.connect(citizen1).discloseConflict(2, 1, "Employee", "Qm2"); // Employee
      await conflictRegistry.connect(citizen1).discloseConflict(3, 2, "Advisor", "Qm3"); // Advisor
      await conflictRegistry.connect(citizen1).discloseConflict(4, 3, "Financial", "Qm4"); // Financial
      await conflictRegistry.connect(citizen1).discloseConflict(5, 4, "Family", "Qm5"); // Family
      await conflictRegistry.connect(citizen1).discloseConflict(6, 5, "Past", "Qm6"); // PastContributor

      // All should be recorded
      expect((await conflictRegistry.getConflict(citizen1.address, 1)).exists).to.equal(true);
      expect((await conflictRegistry.getConflict(citizen1.address, 6)).exists).to.equal(true);
    });
  });

  describe("Quarterly Disclosure", function () {
    it("should submit quarterly disclosure", async function () {
      const quarter = 1;
      const ipfsHash = "QmComprehensive";
      const projectCount = 5;

      await conflictRegistry
        .connect(citizen1)
        .submitQuarterlyDisclosure(quarter, ipfsHash, projectCount);

      const disclosure = await conflictRegistry.getQuarterlyDisclosure(citizen1.address, quarter);
      expect(disclosure.submitted).to.equal(true);
      expect(disclosure.ipfsHash).to.equal(ipfsHash);
      expect(disclosure.projectCount).to.equal(projectCount);
    });

    it("should emit QuarterlyDisclosureSubmitted event", async function () {
      await expect(
        conflictRegistry.connect(citizen1).submitQuarterlyDisclosure(1, "QmHash", 3)
      )
        .to.emit(conflictRegistry, "QuarterlyDisclosureSubmitted")
        .withArgs(citizen1.address, 1, "QmHash", 3);
    });

    it("should update last disclosure quarter", async function () {
      await conflictRegistry.connect(citizen1).submitQuarterlyDisclosure(5, "QmHash", 3);

      expect(await conflictRegistry.lastDisclosureQuarter(citizen1.address)).to.equal(5);
    });

    it("should reject duplicate quarterly disclosure", async function () {
      await conflictRegistry.connect(citizen1).submitQuarterlyDisclosure(1, "QmHash", 3);

      await expect(
        conflictRegistry.connect(citizen1).submitQuarterlyDisclosure(1, "QmHash2", 5)
      ).to.be.revertedWith("Already submitted");
    });
  });

  describe("Voting Restrictions", function () {
    it("should allow voting when no conflict exists", async function () {
      await conflictRegistry.connect(citizen1).submitQuarterlyDisclosure(1, "QmHash", 0);

      const [canVote, reason] = await conflictRegistry.canVoteOnProject(citizen1.address, 1, 1);
      expect(canVote).to.equal(true);
      expect(reason).to.equal("");
    });

    it("should block voting when conflict exists", async function () {
      await conflictRegistry.connect(citizen1).submitQuarterlyDisclosure(1, "QmHash", 1);
      await conflictRegistry.connect(citizen1).discloseConflict(1, 0, "Founder", "QmXxx");

      const [canVote, reason] = await conflictRegistry.canVoteOnProject(citizen1.address, 1, 1);
      expect(canVote).to.equal(false);
      expect(reason).to.include("Conflict:");
    });

    it("should block voting when quarterly disclosure overdue", async function () {
      await conflictRegistry.connect(citizen1).submitQuarterlyDisclosure(1, "QmHash", 0);

      // Check voting in quarter 3 (more than 1 quarter after disclosure)
      const [canVote, reason] = await conflictRegistry.canVoteOnProject(citizen1.address, 1, 3);
      expect(canVote).to.equal(false);
      expect(reason).to.equal("Quarterly disclosure overdue");
    });

    it("should allow voting when disclosure is current", async function () {
      await conflictRegistry.connect(citizen1).submitQuarterlyDisclosure(5, "QmHash", 0);

      // Quarter 6 is within grace period (5 + 1)
      const [canVote] = await conflictRegistry.canVoteOnProject(citizen1.address, 1, 6);
      expect(canVote).to.equal(true);
    });
  });

  describe("Third-Party Review", function () {
    it("should return true when >30% have conflicts", async function () {
      // 3 citizens with conflicts out of 8 total = 37.5%
      await conflictRegistry.connect(citizen1).discloseConflict(1, 0, "Founder", "Qm1");
      await conflictRegistry.connect(citizen2).discloseConflict(1, 1, "Employee", "Qm2");
      await conflictRegistry.connect(citizen3).discloseConflict(1, 2, "Advisor", "Qm3");

      const needsReview = await conflictRegistry.needsThirdPartyReview(1, 8);
      expect(needsReview).to.equal(true);
    });

    it("should return false when <=30% have conflicts", async function () {
      // 1 citizen with conflict out of 10 total = 10%
      await conflictRegistry.connect(citizen1).discloseConflict(1, 0, "Founder", "Qm1");

      const needsReview = await conflictRegistry.needsThirdPartyReview(1, 10);
      expect(needsReview).to.equal(false);
    });

    it("should trigger third-party review", async function () {
      await conflictRegistry.connect(citizen1).discloseConflict(1, 0, "Founder", "Qm1");
      await conflictRegistry.connect(citizen2).discloseConflict(1, 1, "Employee", "Qm2");
      await conflictRegistry.connect(citizen3).discloseConflict(1, 2, "Advisor", "Qm3");

      await expect(conflictRegistry.triggerThirdPartyReview(1, 8))
        .to.emit(conflictRegistry, "ThirdPartyReviewTriggered")
        .withArgs(1, 3, 8);
    });

    it("should reject trigger when review not needed", async function () {
      await conflictRegistry.connect(citizen1).discloseConflict(1, 0, "Founder", "Qm1");

      await expect(conflictRegistry.triggerThirdPartyReview(1, 10)).to.be.revertedWith(
        "Review not needed"
      );
    });
  });

  describe("Whistleblower System", function () {
    it("should report false disclosure", async function () {
      const evidence = "QmEvidence";

      await expect(
        conflictRegistry.connect(citizen2).reportFalseDisclosure(citizen1.address, 1, evidence)
      )
        .to.emit(conflictRegistry, "FalseDisclosureReported")
        .withArgs(citizen2.address, citizen1.address, 0);
    });

    it("should accept bounty pool funding", async function () {
      const amount = ethers.parseEther("1");
      await conflictRegistry.fundBountyPool({ value: amount });

      expect(await conflictRegistry.bountyPool()).to.equal(amount);
    });
  });

  describe("View Functions", function () {
    it("should get conflict details", async function () {
      await conflictRegistry.connect(citizen1).discloseConflict(1, 3, "Token holder", "QmXxx");

      const conflict = await conflictRegistry.getConflict(citizen1.address, 1);
      expect(conflict.exists).to.equal(true);
      expect(conflict.conflictType).to.equal(3); // Financial
    });

    it("should check if disclosure is current", async function () {
      await conflictRegistry.connect(citizen1).submitQuarterlyDisclosure(5, "QmHash", 0);

      expect(await conflictRegistry.isDisclosureCurrent(citizen1.address, 5)).to.equal(true);
      expect(await conflictRegistry.isDisclosureCurrent(citizen1.address, 6)).to.equal(true);
      expect(await conflictRegistry.isDisclosureCurrent(citizen1.address, 7)).to.equal(false);
    });

    it("should get quarterly disclosure", async function () {
      await conflictRegistry.connect(citizen1).submitQuarterlyDisclosure(3, "QmHash", 7);

      const disclosure = await conflictRegistry.getQuarterlyDisclosure(citizen1.address, 3);
      expect(disclosure.projectCount).to.equal(7);
      expect(disclosure.submitted).to.equal(true);
    });
  });
});
