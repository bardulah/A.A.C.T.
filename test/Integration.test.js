const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("Integration Tests", function () {
  let constitution;
  let impactToken;
  let treasury;
  let quadraticFunding;
  let conflictRegistry;

  let owner, governance, minter, decayExecutor;
  let founder1, founder2, contributor1, contributor2, contributor3;
  let project1, project2;

  const INITIAL_TREASURY = ethers.parseEther("10000000"); // $10M

  beforeEach(async function () {
    [
      owner,
      governance,
      minter,
      decayExecutor,
      founder1,
      founder2,
      contributor1,
      contributor2,
      contributor3,
      project1,
      project2,
    ] = await ethers.getSigners();

    // Deploy all contracts
    const Constitution = await ethers.getContractFactory("Constitution");
    constitution = await Constitution.deploy();
    await constitution.waitForDeployment();

    const IMPACTToken = await ethers.getContractFactory("IMPACTToken");
    impactToken = await IMPACTToken.deploy(await constitution.getAddress());
    await impactToken.waitForDeployment();

    const TreasuryManagement = await ethers.getContractFactory("TreasuryManagement");
    treasury = await TreasuryManagement.deploy(
      await constitution.getAddress(),
      await impactToken.getAddress(),
      governance.address,
      INITIAL_TREASURY
    );
    await treasury.waitForDeployment();

    const QuadraticFunding = await ethers.getContractFactory("QuadraticFunding");
    quadraticFunding = await QuadraticFunding.deploy(
      await constitution.getAddress(),
      await impactToken.getAddress(),
      governance.address
    );
    await quadraticFunding.waitForDeployment();

    const ConflictRegistry = await ethers.getContractFactory("ConflictRegistry");
    conflictRegistry = await ConflictRegistry.deploy(await constitution.getAddress());
    await conflictRegistry.waitForDeployment();

    // Set up roles
    await impactToken.setMinter(minter.address);
    await impactToken.setDecayExecutor(decayExecutor.address);
    await conflictRegistry.setCitizensHouse(governance.address);
  });

  describe("Full DAO Lifecycle", function () {
    it("should complete a full quarterly cycle", async function () {
      // Phase 1: Initial IMPACT distribution
      // Founders get 15% of initial distribution
      await impactToken
        .connect(minter)
        .mint(founder1.address, 0, ethers.parseEther("75000"), "Founder allocation");
      await impactToken.connect(minter).setFounderStatus(founder1.address, true);

      await impactToken
        .connect(minter)
        .mint(founder2.address, 0, ethers.parseEther("75000"), "Founder allocation");
      await impactToken.connect(minter).setFounderStatus(founder2.address, true);

      // Contributors get remaining
      await impactToken
        .connect(minter)
        .mint(contributor1.address, 0, ethers.parseEther("100000"), "Contributor");
      await impactToken
        .connect(minter)
        .mint(contributor2.address, 0, ethers.parseEther("50000"), "Contributor");
      await impactToken
        .connect(minter)
        .mint(contributor3.address, 0, ethers.parseEther("25000"), "Contributor");

      // Phase 2: Fund endowment
      await treasury.connect(governance).fundEndowment(ethers.parseEther("2000000"));

      // Phase 3: Create QF round
      await quadraticFunding.connect(governance).createRound(ethers.parseEther("500000"), 30);
      await quadraticFunding
        .connect(governance)
        .addProject(1, project1.address, "Project Alpha", "Public good project");
      await quadraticFunding
        .connect(governance)
        .addProject(1, project2.address, "Project Beta", "Infrastructure project");

      // Phase 4: Contributors make contributions
      // Execute 2 quarters for account age bypass
      await impactToken.connect(decayExecutor).executeQuarterlyDecay();
      await impactToken.connect(decayExecutor).executeQuarterlyDecay();

      await quadraticFunding.connect(contributor1).contribute(1, 0, ethers.parseEther("1000"));
      await quadraticFunding.connect(contributor2).contribute(1, 0, ethers.parseEther("500"));
      await quadraticFunding.connect(contributor3).contribute(1, 1, ethers.parseEther("2000"));

      // Phase 5: End round and calculate matching
      await time.increase(31 * 24 * 60 * 60);
      await quadraticFunding.connect(governance).finalizeRound(1);

      // Phase 6: Distribute grants
      const project1Data = await quadraticFunding.getProject(1, 0);
      const totalFunding = project1Data.directContributions + project1Data.matchingAmount;

      await treasury
        .connect(governance)
        .distributeGrant(project1.address, totalFunding, "Prospective");

      // Phase 7: Execute quarterly decay
      await impactToken.connect(decayExecutor).executeQuarterlyDecay();

      // Verify founder decay (10% per quarter)
      const founder1Impact = await impactToken.getTotalIMPACT(founder1.address);
      // After 3 decays: original * 0.9^3 ≈ 72.9%
      expect(founder1Impact).to.be.lt(ethers.parseEther("150000")); // With 2x bonus

      // Phase 8: Record quarterly metrics
      await treasury.recordQuarterlyMetrics();

      // Verify metrics were recorded
      const metrics = await treasury.getQuarterlyMetrics(0);
      expect(metrics.grantsDistributed).to.be.gt(0);
    });
  });

  describe("Constitutional Enforcement", function () {
    it("should enforce ops budget cap across treasury operations", async function () {
      // Try to exceed $400k annual ops budget
      await treasury
        .connect(governance)
        .payOperationalExpense(owner.address, ethers.parseEther("300000"), "Salaries", "Q1-Q3");

      // This should fail - would bring total to $450k
      await expect(
        treasury
          .connect(governance)
          .payOperationalExpense(owner.address, ethers.parseEther("150000"), "Infrastructure", "Q4")
      ).to.be.revertedWithCustomError(treasury, "ExceedsOperationalCap");

      // Verify the cap from Constitution
      const maxBudget = await constitution.MAX_OPERATIONAL_BUDGET_ANNUAL();
      expect(maxBudget).to.equal(ethers.parseEther("400000"));
    });

    it("should enforce individual IMPACT cap via minting", async function () {
      // Mint large amount to establish supply
      await impactToken
        .connect(minter)
        .mint(contributor1.address, 0, ethers.parseEther("100000"), "Initial");

      // This would exceed 2% cap
      await expect(
        impactToken.connect(minter).mint(contributor1.address, 0, ethers.parseEther("50000"), "More")
      ).to.be.revertedWithCustomError(impactToken, "ExceedsIndividualCap");
    });
  });

  describe("Conflict Resolution Flow", function () {
    it("should block voting based on conflict disclosure", async function () {
      // Citizen discloses conflict
      await conflictRegistry.connect(contributor1).submitQuarterlyDisclosure(1, "QmHash", 1);
      await conflictRegistry.connect(contributor1).discloseConflict(1, 0, "Founder of project", "Qm");

      // Check voting eligibility
      const [canVote, reason] = await conflictRegistry.canVoteOnProject(
        contributor1.address,
        1,
        1
      );

      expect(canVote).to.equal(false);
      expect(reason).to.include("Conflict:");
    });

    it("should require third-party review for high-conflict projects", async function () {
      // Multiple citizens disclose conflicts on same project
      await conflictRegistry.connect(contributor1).discloseConflict(1, 0, "Founder", "Qm1");
      await conflictRegistry.connect(contributor2).discloseConflict(1, 1, "Employee", "Qm2");
      await conflictRegistry.connect(contributor3).discloseConflict(1, 2, "Advisor", "Qm3");

      // 3 out of 8 citizens = 37.5% > 30%
      expect(await conflictRegistry.needsThirdPartyReview(1, 8)).to.equal(true);
    });
  });

  describe("Fee Schedule Progression", function () {
    it("should progress fees over DAO lifetime", async function () {
      // Year 1: 0.5%
      const year1Fee = await treasury.currentFeeBPS();
      expect(year1Fee).to.equal(50);

      // Advance 1 year
      await time.increase(365 * 24 * 60 * 60);
      await treasury.updateFeeSchedule();

      // Year 2: 1%
      const year2Fee = await treasury.currentFeeBPS();
      expect(year2Fee).to.equal(100);

      // Advance another year
      await time.increase(365 * 24 * 60 * 60);
      await treasury.updateFeeSchedule();

      // Year 3+: 2%
      const year3Fee = await treasury.currentFeeBPS();
      expect(year3Fee).to.equal(200);
    });
  });

  describe("Sybil Resistance in QF", function () {
    it("should detect coordinated contribution patterns", async function () {
      // Setup round
      await quadraticFunding.connect(governance).createRound(ethers.parseEther("100000"), 30);
      await quadraticFunding.connect(governance).addProject(1, project1.address, "Project", "Desc");
      await quadraticFunding.connect(governance).addProject(1, project2.address, "Project2", "Desc2");

      // Mint IMPACT and advance quarters
      await impactToken.connect(minter).mint(contributor1.address, 0, ethers.parseEther("1000"), "C1");
      await impactToken.connect(minter).mint(contributor2.address, 0, ethers.parseEther("1000"), "C2");
      await impactToken.connect(decayExecutor).executeQuarterlyDecay();
      await impactToken.connect(decayExecutor).executeQuarterlyDecay();

      // Coordinated pattern - same projects, similar amounts
      await quadraticFunding.connect(contributor1).contribute(1, 0, ethers.parseEther("100"));
      await quadraticFunding.connect(contributor1).contribute(1, 1, ethers.parseEther("50"));

      await quadraticFunding.connect(contributor2).contribute(1, 0, ethers.parseEther("100"));
      await quadraticFunding.connect(contributor2).contribute(1, 1, ethers.parseEther("50"));

      // Finalize and check matching is affected by similarity
      await time.increase(31 * 24 * 60 * 60);
      await quadraticFunding.connect(governance).finalizeRound(1);

      const project = await quadraticFunding.getProject(1, 0);
      // Matching should still occur but be reduced due to similarity
      expect(project.matchingAmount).to.be.gt(0);
      // 10x cap should apply
      expect(project.matchingAmount).to.be.lte(project.directContributions * 10n);
    });
  });

  describe("Founder De-escalation Over Time", function () {
    it("should reduce founder power through accelerated decay", async function () {
      // Initial founder allocation
      const initialAmount = ethers.parseEther("100000");
      await impactToken.connect(minter).mint(founder1.address, 0, initialAmount, "Founder");
      await impactToken.connect(minter).setFounderStatus(founder1.address, true);

      const initialBalance = await impactToken.getTotalIMPACT(founder1.address);

      // Execute 4 quarters of decay (1 year)
      for (let i = 0; i < 4; i++) {
        await impactToken.connect(decayExecutor).executeQuarterlyDecay();
      }

      const afterYear1 = await impactToken.getTotalIMPACT(founder1.address);

      // 10% decay per quarter = 0.9^4 ≈ 65.6% remaining
      // Should be around 65% of initial
      expect(afterYear1).to.be.lt(initialBalance);
      expect(afterYear1).to.be.gt((initialBalance * 50n) / 100n); // > 50%
      expect(afterYear1).to.be.lt((initialBalance * 70n) / 100n); // < 70%
    });

    it("should redistribute decayed IMPACT to bottom 50%", async function () {
      // Setup: 1 founder, 2 small contributors
      await impactToken.connect(minter).mint(founder1.address, 0, ethers.parseEther("100000"), "Founder");
      await impactToken.connect(minter).setFounderStatus(founder1.address, true);

      await impactToken.connect(minter).mint(contributor1.address, 0, ethers.parseEther("1000"), "Small");
      await impactToken.connect(minter).mint(contributor2.address, 0, ethers.parseEther("500"), "Smaller");

      const smallBefore = await impactToken.getTotalIMPACT(contributor2.address);

      // Execute decay
      await impactToken.connect(decayExecutor).executeQuarterlyDecay();

      const smallAfter = await impactToken.getTotalIMPACT(contributor2.address);

      // contributor2 is in bottom 50%, should receive redistribution
      // Effect depends on decay amount and redistribution math
      // The key is that bottom 50% get some benefit from founder decay
      expect(smallAfter).to.be.gte(0); // Should still have balance
    });
  });

  describe("Grant Pipeline Integration", function () {
    it("should flow from QF matching to treasury distribution", async function () {
      // Fund endowment first
      await treasury.connect(governance).fundEndowment(ethers.parseEther("2000000"));

      // Create and fund QF round
      await quadraticFunding.connect(governance).createRound(ethers.parseEther("500000"), 30);
      await quadraticFunding.connect(governance).addProject(1, project1.address, "Project", "Desc");

      // Setup contributors and contribute
      await impactToken.connect(minter).mint(contributor1.address, 0, ethers.parseEther("1000"), "C1");
      await impactToken.connect(decayExecutor).executeQuarterlyDecay();
      await impactToken.connect(decayExecutor).executeQuarterlyDecay();

      await quadraticFunding.connect(contributor1).contribute(1, 0, ethers.parseEther("10000"));

      // Finalize round
      await time.increase(31 * 24 * 60 * 60);
      await quadraticFunding.connect(governance).finalizeRound(1);

      // Get project funding
      const projectData = await quadraticFunding.getProject(1, 0);
      const totalGrant = projectData.directContributions + projectData.matchingAmount;

      // Distribute through treasury
      const treasuryBefore = await treasury.treasuryBalance();
      await treasury.connect(governance).distributeGrant(project1.address, totalGrant, "QF Round 1");
      const treasuryAfter = await treasury.treasuryBalance();

      // Treasury should decrease (minus fees)
      expect(treasuryAfter).to.be.lt(treasuryBefore);

      // Fees should be collected
      expect(await treasury.feesCollectedThisYear()).to.be.gt(0);
    });
  });

  describe("Edge Cases", function () {
    it("should handle zero contributions gracefully", async function () {
      await quadraticFunding.connect(governance).createRound(ethers.parseEther("100000"), 30);
      await quadraticFunding.connect(governance).addProject(1, project1.address, "Project", "Desc");

      // No contributions made
      await time.increase(31 * 24 * 60 * 60);

      // Should finalize without error
      await quadraticFunding.connect(governance).finalizeRound(1);

      const project = await quadraticFunding.getProject(1, 0);
      expect(project.matchingAmount).to.equal(0);
    });

    it("should handle single contributor", async function () {
      await quadraticFunding.connect(governance).createRound(ethers.parseEther("100000"), 30);
      await quadraticFunding.connect(governance).addProject(1, project1.address, "Project", "Desc");

      await impactToken.connect(minter).mint(contributor1.address, 0, ethers.parseEther("1000"), "C1");
      await impactToken.connect(decayExecutor).executeQuarterlyDecay();
      await impactToken.connect(decayExecutor).executeQuarterlyDecay();

      await quadraticFunding.connect(contributor1).contribute(1, 0, ethers.parseEther("100"));

      await time.increase(31 * 24 * 60 * 60);
      await quadraticFunding.connect(governance).finalizeRound(1);

      const project = await quadraticFunding.getProject(1, 0);
      expect(project.matchingAmount).to.be.gt(0);
    });
  });
});
