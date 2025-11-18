const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("TreasuryManagement", function () {
  let constitution;
  let impactToken;
  let treasury;
  let owner, governance, recipient, user1;

  const INITIAL_TREASURY = ethers.parseEther("10000000"); // $10M

  beforeEach(async function () {
    [owner, governance, recipient, user1] = await ethers.getSigners();

    // Deploy Constitution
    const Constitution = await ethers.getContractFactory("Constitution");
    constitution = await Constitution.deploy();
    await constitution.waitForDeployment();

    // Deploy IMPACTToken
    const IMPACTToken = await ethers.getContractFactory("IMPACTToken");
    impactToken = await IMPACTToken.deploy(await constitution.getAddress());
    await impactToken.waitForDeployment();

    // Deploy TreasuryManagement
    const TreasuryManagement = await ethers.getContractFactory("TreasuryManagement");
    treasury = await TreasuryManagement.deploy(
      await constitution.getAddress(),
      await impactToken.getAddress(),
      governance.address,
      INITIAL_TREASURY
    );
    await treasury.waitForDeployment();
  });

  describe("Deployment", function () {
    it("should set initial treasury balance", async function () {
      expect(await treasury.treasuryBalance()).to.equal(INITIAL_TREASURY);
    });

    it("should set constitution reference", async function () {
      expect(await treasury.constitution()).to.equal(await constitution.getAddress());
    });

    it("should set impact token reference", async function () {
      expect(await treasury.impactToken()).to.equal(await impactToken.getAddress());
    });

    it("should set governance address", async function () {
      expect(await treasury.governance()).to.equal(governance.address);
    });

    it("should set initial fee to Year 1 rate (0.5%)", async function () {
      expect(await treasury.currentFeeBPS()).to.equal(50);
    });
  });

  describe("Grant Distribution", function () {
    it("should distribute grant with fee collection", async function () {
      const grantAmount = ethers.parseEther("100000"); // $100k
      const expectedFee = (grantAmount * 50n) / 10000n; // 0.5%
      const netAmount = grantAmount - expectedFee;

      await treasury
        .connect(governance)
        .distributeGrant(recipient.address, grantAmount, "Prospective");

      // Treasury balance should decrease by net amount
      expect(await treasury.treasuryBalance()).to.equal(INITIAL_TREASURY - netAmount);
      expect(await treasury.grantsDistributedThisYear()).to.equal(grantAmount);
      expect(await treasury.feesCollectedThisYear()).to.equal(expectedFee);
    });

    it("should emit GrantDistributed event", async function () {
      const grantAmount = ethers.parseEther("100000");
      const expectedFee = (grantAmount * 50n) / 10000n;
      const netAmount = grantAmount - expectedFee;

      await expect(
        treasury.connect(governance).distributeGrant(recipient.address, grantAmount, "Prospective")
      )
        .to.emit(treasury, "GrantDistributed")
        .withArgs(recipient.address, netAmount, expectedFee, "Prospective");
    });

    it("should require endowment for large grants (>$3M annually)", async function () {
      const largeGrant = ethers.parseEther("3500000"); // $3.5M

      // Without endowment, should revert
      await expect(
        treasury.connect(governance).distributeGrant(recipient.address, largeGrant, "Prospective")
      ).to.be.revertedWithCustomError(treasury, "EndowmentNotFunded");
    });

    it("should allow large grants with sufficient endowment", async function () {
      // Fund endowment first
      await treasury.connect(governance).fundEndowment(ethers.parseEther("2000000"));

      const largeGrant = ethers.parseEther("3500000");
      await treasury
        .connect(governance)
        .distributeGrant(recipient.address, largeGrant, "Prospective");

      expect(await treasury.grantsDistributedThisYear()).to.equal(largeGrant);
    });

    it("should only allow governance to distribute grants", async function () {
      await expect(
        treasury.connect(user1).distributeGrant(recipient.address, ethers.parseEther("1000"), "Test")
      ).to.be.revertedWithCustomError(treasury, "OnlyGovernance");
    });

    it("should revert on insufficient balance", async function () {
      const tooMuch = ethers.parseEther("20000000"); // $20M > $10M

      await expect(
        treasury.connect(governance).distributeGrant(recipient.address, tooMuch, "Prospective")
      ).to.be.revertedWithCustomError(treasury, "InsufficientBalance");
    });
  });

  describe("Operational Spending", function () {
    it("should pay operational expense within caps", async function () {
      const amount = ethers.parseEther("50000"); // $50k

      await treasury
        .connect(governance)
        .payOperationalExpense(recipient.address, amount, "Salaries", "Q1 salaries");

      expect(await treasury.opsCostsThisYear()).to.equal(amount);
      expect(await treasury.treasuryBalance()).to.equal(INITIAL_TREASURY - amount);
    });

    it("should emit OperationalExpense event", async function () {
      const amount = ethers.parseEther("50000");

      await expect(
        treasury
          .connect(governance)
          .payOperationalExpense(recipient.address, amount, "Infrastructure", "AWS costs")
      )
        .to.emit(treasury, "OperationalExpense")
        .withArgs(recipient.address, amount, "Infrastructure", "AWS costs");
    });

    it("should enforce $400k annual cap", async function () {
      // Try to pay $500k (exceeds $400k cap)
      const tooMuch = ethers.parseEther("500000");

      await expect(
        treasury.connect(governance).payOperationalExpense(recipient.address, tooMuch, "Salaries", "Too much")
      ).to.be.revertedWithCustomError(treasury, "ExceedsOperationalCap");
    });

    it("should allow payments up to $400k cap", async function () {
      // Pay multiple times up to cap
      await treasury
        .connect(governance)
        .payOperationalExpense(recipient.address, ethers.parseEther("200000"), "Salaries", "Q1");

      await treasury
        .connect(governance)
        .payOperationalExpense(recipient.address, ethers.parseEther("200000"), "Salaries", "Q2");

      expect(await treasury.opsCostsThisYear()).to.equal(ethers.parseEther("400000"));
    });

    it("should reject payment that would exceed cap", async function () {
      await treasury
        .connect(governance)
        .payOperationalExpense(recipient.address, ethers.parseEther("300000"), "Salaries", "Q1");

      // This would bring total to $450k > $400k
      await expect(
        treasury
          .connect(governance)
          .payOperationalExpense(recipient.address, ethers.parseEther("150000"), "Salaries", "Q2")
      ).to.be.revertedWithCustomError(treasury, "ExceedsOperationalCap");
    });

    it("should only allow governance to pay expenses", async function () {
      await expect(
        treasury
          .connect(user1)
          .payOperationalExpense(recipient.address, ethers.parseEther("1000"), "Test", "Test")
      ).to.be.revertedWithCustomError(treasury, "OnlyGovernance");
    });
  });

  describe("Fee Management", function () {
    it("should adjust fee when allowed", async function () {
      // Need to wait 4 quarters to adjust
      await impactToken.setMinter(owner.address);
      await impactToken.setDecayExecutor(owner.address);

      // Execute 4 quarters of decay to increment quarter counter
      for (let i = 0; i < 4; i++) {
        await impactToken.executeQuarterlyDecay();
      }

      const newFee = 100; // 1%
      await treasury.connect(governance).adjustFee(newFee);

      expect(await treasury.currentFeeBPS()).to.equal(newFee);
    });

    it("should reject fee adjustment too frequently", async function () {
      const newFee = 100;
      await expect(treasury.connect(governance).adjustFee(newFee)).to.be.revertedWithCustomError(
        treasury,
        "FeeTooFrequent"
      );
    });

    it("should reject fee above maximum (4%)", async function () {
      // Set up to allow adjustment
      await impactToken.setMinter(owner.address);
      await impactToken.setDecayExecutor(owner.address);
      for (let i = 0; i < 4; i++) {
        await impactToken.executeQuarterlyDecay();
      }

      const tooHighFee = 500; // 5% > 4% max
      await expect(treasury.connect(governance).adjustFee(tooHighFee)).to.be.revertedWithCustomError(
        treasury,
        "FeeTooHigh"
      );
    });

    it("should update fee schedule based on DAO age", async function () {
      const initialFee = await treasury.currentFeeBPS();
      expect(initialFee).to.equal(50); // Year 1

      // Move forward 1 year
      await time.increase(365 * 24 * 60 * 60);
      await treasury.updateFeeSchedule();

      expect(await treasury.currentFeeBPS()).to.equal(100); // Year 2
    });

    it("should emit FeeAdjusted event", async function () {
      await impactToken.setMinter(owner.address);
      await impactToken.setDecayExecutor(owner.address);
      for (let i = 0; i < 4; i++) {
        await impactToken.executeQuarterlyDecay();
      }

      await expect(treasury.connect(governance).adjustFee(100))
        .to.emit(treasury, "FeeAdjusted");
    });
  });

  describe("Endowment Management", function () {
    it("should fund endowment", async function () {
      const amount = ethers.parseEther("2000000"); // $2M
      await treasury.connect(governance).fundEndowment(amount);

      expect(await treasury.endowmentBalance()).to.equal(amount);
      expect(await treasury.treasuryBalance()).to.equal(INITIAL_TREASURY - amount);
    });

    it("should emit EndowmentFunded event", async function () {
      const amount = ethers.parseEther("2000000");
      await expect(treasury.connect(governance).fundEndowment(amount))
        .to.emit(treasury, "EndowmentFunded")
        .withArgs(amount, amount);
    });

    it("should withdraw from endowment in emergency", async function () {
      const endowmentAmount = ethers.parseEther("2000000");
      await treasury.connect(governance).fundEndowment(endowmentAmount);

      const withdrawAmount = ethers.parseEther("500000");
      await treasury.connect(governance).withdrawFromEndowment(withdrawAmount);

      expect(await treasury.endowmentBalance()).to.equal(endowmentAmount - withdrawAmount);
      expect(await treasury.treasuryBalance()).to.equal(INITIAL_TREASURY - endowmentAmount + withdrawAmount);
    });

    it("should revert withdrawal exceeding endowment", async function () {
      await treasury.connect(governance).fundEndowment(ethers.parseEther("1000000"));

      await expect(
        treasury.connect(governance).withdrawFromEndowment(ethers.parseEther("2000000"))
      ).to.be.revertedWithCustomError(treasury, "InsufficientBalance");
    });
  });

  describe("Emergency Reserve", function () {
    it("should allocate emergency reserve", async function () {
      const amount = ethers.parseEther("300000"); // $300k
      await treasury.connect(governance).allocateEmergencyReserve(amount);

      expect(await treasury.emergencyReserve()).to.equal(amount);
      expect(await treasury.treasuryBalance()).to.equal(INITIAL_TREASURY - amount);
    });

    it("should emit EmergencyReserveAllocated event", async function () {
      const amount = ethers.parseEther("300000");
      await expect(treasury.connect(governance).allocateEmergencyReserve(amount))
        .to.emit(treasury, "EmergencyReserveAllocated")
        .withArgs(amount);
    });
  });

  describe("Quarterly Reporting", function () {
    it("should record quarterly metrics", async function () {
      // Make some transactions
      await treasury
        .connect(governance)
        .distributeGrant(recipient.address, ethers.parseEther("100000"), "Prospective");
      await treasury
        .connect(governance)
        .payOperationalExpense(recipient.address, ethers.parseEther("50000"), "Salaries", "Q1");

      await treasury.recordQuarterlyMetrics();

      const metrics = await treasury.getQuarterlyMetrics(0);
      expect(metrics.grantsDistributed).to.equal(ethers.parseEther("100000"));
      expect(metrics.opsCosts).to.equal(ethers.parseEther("50000"));
    });

    it("should emit QuarterlyReport event", async function () {
      await expect(treasury.recordQuarterlyMetrics()).to.emit(treasury, "QuarterlyReport");
    });
  });

  describe("Fiscal Year Management", function () {
    it("should reset counters at start of new year", async function () {
      // Make some transactions
      await treasury
        .connect(governance)
        .distributeGrant(recipient.address, ethers.parseEther("100000"), "Prospective");

      // Move forward 1 year
      await time.increase(365 * 24 * 60 * 60);

      await treasury.startNewFiscalYear();

      expect(await treasury.grantsDistributedThisYear()).to.equal(0);
      expect(await treasury.opsCostsThisYear()).to.equal(0);
      expect(await treasury.feesCollectedThisYear()).to.equal(0);
    });

    it("should reject new year start before year complete", async function () {
      await expect(treasury.startNewFiscalYear()).to.be.revertedWith("Year not complete");
    });
  });

  describe("View Functions", function () {
    it("should calculate treasury runway in months", async function () {
      // Set some ops costs
      await treasury
        .connect(governance)
        .payOperationalExpense(recipient.address, ethers.parseEther("120000"), "Salaries", "Annual");

      const runway = await treasury.getTreasuryRunwayMonths();
      // $10M treasury / ($120k/12 months) ≈ 1000 months
      expect(runway).to.be.gt(0);
    });

    it("should return max runway with no ops costs", async function () {
      const runway = await treasury.getTreasuryRunwayMonths();
      expect(runway).to.equal(ethers.MaxUint256);
    });

    it("should validate ops budget", async function () {
      const validBudget = ethers.parseEther("300000");
      expect(await treasury.validateOpsBudget(validBudget)).to.equal(true);

      const invalidBudget = ethers.parseEther("500000");
      expect(await treasury.validateOpsBudget(invalidBudget)).to.equal(false);
    });
  });

  describe("Admin Functions", function () {
    it("should accept treasury deposits", async function () {
      const depositAmount = ethers.parseEther("1000000");
      await treasury.depositToTreasury(depositAmount);

      expect(await treasury.treasuryBalance()).to.equal(INITIAL_TREASURY + depositAmount);
    });

    it("should update governance address", async function () {
      const newGovernance = user1.address;
      await treasury.connect(governance).updateGovernance(newGovernance);

      expect(await treasury.governance()).to.equal(newGovernance);
    });
  });
});
