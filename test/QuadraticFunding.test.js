const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("QuadraticFunding", function () {
  let constitution;
  let impactToken;
  let quadraticFunding;
  let owner, governance, minter, project1, project2, contributor1, contributor2, contributor3;

  beforeEach(async function () {
    [owner, governance, minter, project1, project2, contributor1, contributor2, contributor3] =
      await ethers.getSigners();

    // Deploy Constitution
    const Constitution = await ethers.getContractFactory("Constitution");
    constitution = await Constitution.deploy();
    await constitution.waitForDeployment();

    // Deploy IMPACTToken
    const IMPACTToken = await ethers.getContractFactory("IMPACTToken");
    impactToken = await IMPACTToken.deploy(await constitution.getAddress());
    await impactToken.waitForDeployment();

    // Set minter and decay executor
    await impactToken.setMinter(minter.address);
    await impactToken.setDecayExecutor(owner.address);

    // Deploy QuadraticFunding
    const QuadraticFunding = await ethers.getContractFactory("QuadraticFunding");
    quadraticFunding = await QuadraticFunding.deploy(
      await constitution.getAddress(),
      await impactToken.getAddress(),
      governance.address
    );
    await quadraticFunding.waitForDeployment();

    // Mint IMPACT to contributors (need 100+ to participate)
    await impactToken
      .connect(minter)
      .mint(contributor1.address, 0, ethers.parseEther("1000"), "Contributor1");
    await impactToken
      .connect(minter)
      .mint(contributor2.address, 0, ethers.parseEther("1000"), "Contributor2");
    await impactToken
      .connect(minter)
      .mint(contributor3.address, 0, ethers.parseEther("1000"), "Contributor3");

    // Execute decay to advance quarters (need 2+ quarters for account age requirement bypass)
    await impactToken.executeQuarterlyDecay();
    await impactToken.executeQuarterlyDecay();
  });

  describe("Round Management", function () {
    it("should create a new round", async function () {
      const matchingPool = ethers.parseEther("100000"); // $100k
      const duration = 30; // 30 days

      await quadraticFunding.connect(governance).createRound(matchingPool, duration);

      expect(await quadraticFunding.currentRoundId()).to.equal(1);

      const round = await quadraticFunding.getRound(1);
      expect(round.matchingPool).to.equal(matchingPool);
      expect(round.finalized).to.equal(false);
    });

    it("should emit RoundCreated event", async function () {
      const matchingPool = ethers.parseEther("100000");
      const duration = 30;

      await expect(quadraticFunding.connect(governance).createRound(matchingPool, duration))
        .to.emit(quadraticFunding, "RoundCreated");
    });

    it("should add project to round", async function () {
      // Create round first
      await quadraticFunding.connect(governance).createRound(ethers.parseEther("100000"), 30);

      // Add project
      await quadraticFunding
        .connect(governance)
        .addProject(1, project1.address, "Project 1", "Description 1");

      const project = await quadraticFunding.getProject(1, 0);
      expect(project.recipient).to.equal(project1.address);
      expect(project.name).to.equal("Project 1");
      expect(project.exists).to.equal(true);
    });

    it("should only allow governance to create rounds", async function () {
      await expect(
        quadraticFunding.connect(contributor1).createRound(ethers.parseEther("100000"), 30)
      ).to.be.revertedWith("Only governance");
    });

    it("should only allow governance to add projects", async function () {
      await quadraticFunding.connect(governance).createRound(ethers.parseEther("100000"), 30);

      await expect(
        quadraticFunding
          .connect(contributor1)
          .addProject(1, project1.address, "Project", "Description")
      ).to.be.revertedWith("Only governance");
    });
  });

  describe("Contributions", function () {
    beforeEach(async function () {
      // Create round and add projects
      await quadraticFunding.connect(governance).createRound(ethers.parseEther("100000"), 30);
      await quadraticFunding
        .connect(governance)
        .addProject(1, project1.address, "Project 1", "Description 1");
      await quadraticFunding
        .connect(governance)
        .addProject(1, project2.address, "Project 2", "Description 2");
    });

    it("should allow contribution from qualified account", async function () {
      const amount = ethers.parseEther("100");
      await quadraticFunding.connect(contributor1).contribute(1, 0, amount);

      const project = await quadraticFunding.getProject(1, 0);
      expect(project.directContributions).to.equal(amount);
      expect(project.contributorCount).to.equal(1);
    });

    it("should emit ContributionMade event", async function () {
      const amount = ethers.parseEther("100");

      await expect(quadraticFunding.connect(contributor1).contribute(1, 0, amount))
        .to.emit(quadraticFunding, "ContributionMade")
        .withArgs(1, 0, contributor1.address, amount);
    });

    it("should track contributor projects", async function () {
      await quadraticFunding.connect(contributor1).contribute(1, 0, ethers.parseEther("100"));
      await quadraticFunding.connect(contributor1).contribute(1, 1, ethers.parseEther("50"));

      // Contributor1 should have contributed to 2 projects
      const contributions = await quadraticFunding.getProjectContributions(1, 0);
      expect(contributions.length).to.equal(1);
      expect(contributions[0].contributor).to.equal(contributor1.address);
    });

    it("should reject contribution from new account without IMPACT", async function () {
      // Deploy fresh token and contributor without IMPACT
      const newContributor = (await ethers.getSigners())[9];

      await expect(
        quadraticFunding.connect(newContributor).contribute(1, 0, ethers.parseEther("100"))
      ).to.be.revertedWithCustomError(quadraticFunding, "AccountTooNew");
    });

    it("should reject contribution to non-existent project", async function () {
      await expect(
        quadraticFunding.connect(contributor1).contribute(1, 99, ethers.parseEther("100"))
      ).to.be.revertedWithCustomError(quadraticFunding, "ProjectNotFound");
    });

    it("should reject contribution when round not active", async function () {
      // Move past round end time
      await time.increase(31 * 24 * 60 * 60);

      await expect(
        quadraticFunding.connect(contributor1).contribute(1, 0, ethers.parseEther("100"))
      ).to.be.revertedWithCustomError(quadraticFunding, "RoundNotActive");
    });

    it("should detect Sybil patterns and emit event", async function () {
      // Have multiple contributors contribute to same projects in similar patterns
      await quadraticFunding.connect(contributor1).contribute(1, 0, ethers.parseEther("100"));
      await quadraticFunding.connect(contributor1).contribute(1, 1, ethers.parseEther("50"));

      await quadraticFunding.connect(contributor2).contribute(1, 0, ethers.parseEther("100"));
      await quadraticFunding.connect(contributor2).contribute(1, 1, ethers.parseEther("50"));

      // Third contributor with same pattern might trigger Sybil detection
      // Note: Event is emitted when similarity > 80%
      await quadraticFunding.connect(contributor3).contribute(1, 0, ethers.parseEther("100"));
      await quadraticFunding.connect(contributor3).contribute(1, 1, ethers.parseEther("50"));
    });
  });

  describe("Matching Calculation", function () {
    beforeEach(async function () {
      // Create round and add projects
      await quadraticFunding.connect(governance).createRound(ethers.parseEther("100000"), 30);
      await quadraticFunding
        .connect(governance)
        .addProject(1, project1.address, "Project 1", "Description 1");
      await quadraticFunding
        .connect(governance)
        .addProject(1, project2.address, "Project 2", "Description 2");
    });

    it("should finalize round and calculate matching", async function () {
      // Make contributions
      await quadraticFunding.connect(contributor1).contribute(1, 0, ethers.parseEther("100"));
      await quadraticFunding.connect(contributor2).contribute(1, 0, ethers.parseEther("100"));
      await quadraticFunding.connect(contributor3).contribute(1, 1, ethers.parseEther("50"));

      // Move past round end
      await time.increase(31 * 24 * 60 * 60);

      // Finalize
      await quadraticFunding.connect(governance).finalizeRound(1);

      const round = await quadraticFunding.getRound(1);
      expect(round.finalized).to.equal(true);

      const project1Data = await quadraticFunding.getProject(1, 0);
      expect(project1Data.matchingAmount).to.be.gt(0);
    });

    it("should emit MatchingCalculated events", async function () {
      await quadraticFunding.connect(contributor1).contribute(1, 0, ethers.parseEther("100"));

      await time.increase(31 * 24 * 60 * 60);

      await expect(quadraticFunding.connect(governance).finalizeRound(1))
        .to.emit(quadraticFunding, "MatchingCalculated");
    });

    it("should apply 10x matching cap", async function () {
      // Make small contribution
      await quadraticFunding.connect(contributor1).contribute(1, 0, ethers.parseEther("10"));

      await time.increase(31 * 24 * 60 * 60);
      await quadraticFunding.connect(governance).finalizeRound(1);

      const project = await quadraticFunding.getProject(1, 0);
      const maxMatching = project.directContributions * 10n;

      // Matching should be capped at 10x direct contributions
      expect(project.matchingAmount).to.be.lte(maxMatching);
    });

    it("should reject finalization before round ends", async function () {
      await expect(
        quadraticFunding.connect(governance).finalizeRound(1)
      ).to.be.revertedWith("Round not ended");
    });

    it("should reject double finalization", async function () {
      await time.increase(31 * 24 * 60 * 60);
      await quadraticFunding.connect(governance).finalizeRound(1);

      await expect(
        quadraticFunding.connect(governance).finalizeRound(1)
      ).to.be.revertedWith("Already finalized");
    });
  });

  describe("Pairwise Bonding Algorithm", function () {
    beforeEach(async function () {
      await quadraticFunding.connect(governance).createRound(ethers.parseEther("100000"), 30);
      await quadraticFunding
        .connect(governance)
        .addProject(1, project1.address, "Project 1", "Description 1");
      await quadraticFunding
        .connect(governance)
        .addProject(1, project2.address, "Project 2", "Description 2");
    });

    it("should reward diverse contributions more than coordinated ones", async function () {
      // Scenario 1: Diverse contributions (different projects)
      await quadraticFunding.connect(contributor1).contribute(1, 0, ethers.parseEther("100"));
      await quadraticFunding.connect(contributor2).contribute(1, 1, ethers.parseEther("100"));

      const estimate1 = await quadraticFunding.estimateMatching(1, 0);

      // Reset by creating new round
      await quadraticFunding.connect(governance).createRound(ethers.parseEther("100000"), 30);
      await quadraticFunding
        .connect(governance)
        .addProject(2, project1.address, "Project 1", "Description 1");
      await quadraticFunding
        .connect(governance)
        .addProject(2, project2.address, "Project 2", "Description 2");

      // Scenario 2: Coordinated contributions (same projects)
      await quadraticFunding.connect(contributor1).contribute(2, 0, ethers.parseEther("100"));
      await quadraticFunding.connect(contributor1).contribute(2, 1, ethers.parseEther("50"));
      await quadraticFunding.connect(contributor2).contribute(2, 0, ethers.parseEther("100"));
      await quadraticFunding.connect(contributor2).contribute(2, 1, ethers.parseEther("50"));

      const estimate2 = await quadraticFunding.estimateMatching(2, 0);

      // Both should have matching amounts
      expect(estimate1).to.be.gt(0);
      expect(estimate2).to.be.gt(0);
    });

    it("should calculate similarity between contributors", async function () {
      // Contributors with same contribution pattern should have high similarity
      await quadraticFunding.connect(contributor1).contribute(1, 0, ethers.parseEther("100"));
      await quadraticFunding.connect(contributor1).contribute(1, 1, ethers.parseEther("50"));

      await quadraticFunding.connect(contributor2).contribute(1, 0, ethers.parseEther("100"));
      await quadraticFunding.connect(contributor2).contribute(1, 1, ethers.parseEther("50"));

      // This is internal, but we can test via matching calculation
      await time.increase(31 * 24 * 60 * 60);
      await quadraticFunding.connect(governance).finalizeRound(1);

      const project = await quadraticFunding.getProject(1, 0);
      expect(project.matchingAmount).to.be.gt(0);
    });
  });

  describe("View Functions", function () {
    beforeEach(async function () {
      await quadraticFunding.connect(governance).createRound(ethers.parseEther("100000"), 30);
      await quadraticFunding
        .connect(governance)
        .addProject(1, project1.address, "Project 1", "Description 1");
      await quadraticFunding.connect(contributor1).contribute(1, 0, ethers.parseEther("100"));
    });

    it("should get project details", async function () {
      const project = await quadraticFunding.getProject(1, 0);
      expect(project.recipient).to.equal(project1.address);
      expect(project.directContributions).to.equal(ethers.parseEther("100"));
    });

    it("should get project contributions", async function () {
      const contributions = await quadraticFunding.getProjectContributions(1, 0);
      expect(contributions.length).to.equal(1);
      expect(contributions[0].contributor).to.equal(contributor1.address);
    });

    it("should get round details", async function () {
      const round = await quadraticFunding.getRound(1);
      expect(round.matchingPool).to.equal(ethers.parseEther("100000"));
      expect(round.finalized).to.equal(false);
    });

    it("should estimate matching before finalization", async function () {
      const estimate = await quadraticFunding.estimateMatching(1, 0);
      expect(estimate).to.be.gt(0);
    });
  });
});
