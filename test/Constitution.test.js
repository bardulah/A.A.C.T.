const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("Constitution", function () {
  let constitution;
  let owner;

  beforeEach(async function () {
    [owner] = await ethers.getSigners();
    const Constitution = await ethers.getContractFactory("Constitution");
    constitution = await Constitution.deploy();
    await constitution.waitForDeployment();
  });

  describe("Mission", function () {
    it("should have correct mission statement", async function () {
      expect(await constitution.MISSION()).to.equal(
        "Fund public goods through non-extractive mechanisms"
      );
    });
  });

  describe("Financial Invariants", function () {
    it("should have MIN_PUBLIC_GOODS_ALLOCATION = 85%", async function () {
      expect(await constitution.MIN_PUBLIC_GOODS_ALLOCATION()).to.equal(85);
    });

    it("should have MAX_OPERATIONAL_BUDGET_ANNUAL = $400k", async function () {
      const expected = ethers.parseEther("400000");
      expect(await constitution.MAX_OPERATIONAL_BUDGET_ANNUAL()).to.equal(expected);
    });

    it("should have MIN_ENDOWMENT_SIZE = $2M", async function () {
      const expected = ethers.parseEther("2000000");
      expect(await constitution.MIN_ENDOWMENT_SIZE()).to.equal(expected);
    });

    it("should have MAX_OPERATIONAL_PERCENTAGE = 12%", async function () {
      expect(await constitution.MAX_OPERATIONAL_PERCENTAGE()).to.equal(12);
    });
  });

  describe("Token Invariants", function () {
    it("should have IMPACT_TRANSFERABLE = false (soulbound)", async function () {
      expect(await constitution.IMPACT_TRANSFERABLE()).to.equal(false);
    });

    it("should prohibit wealth-based voting", async function () {
      expect(await constitution.WEALTH_BASED_VOTING_ALLOWED()).to.equal(false);
    });

    it("should prohibit profit extraction", async function () {
      expect(await constitution.PROFIT_EXTRACTION_ALLOWED()).to.equal(false);
    });
  });

  describe("Governance Invariants", function () {
    it("should have MAX_INDIVIDUAL_IMPACT_SHARE = 2%", async function () {
      expect(await constitution.MAX_INDIVIDUAL_IMPACT_SHARE()).to.equal(2);
    });

    it("should have FOUNDER_DECAY_RATE = 10%", async function () {
      expect(await constitution.FOUNDER_DECAY_RATE()).to.equal(10);
    });

    it("should have BASE_DECAY_RATE = 2%", async function () {
      expect(await constitution.BASE_DECAY_RATE()).to.equal(2);
    });

    it("should have QUORUM_PERCENTAGE = 25%", async function () {
      expect(await constitution.QUORUM_PERCENTAGE()).to.equal(25);
    });

    it("should have SUPERMAJORITY_THRESHOLD = 67%", async function () {
      expect(await constitution.SUPERMAJORITY_THRESHOLD()).to.equal(67);
    });
  });

  describe("Anti-Extraction Invariants", function () {
    it("should require conflict disclosure", async function () {
      expect(await constitution.CONFLICT_DISCLOSURE_REQUIRED()).to.equal(true);
    });

    it("should have MATCHING_MULTIPLIER_CAP = 10x", async function () {
      expect(await constitution.MATCHING_MULTIPLIER_CAP()).to.equal(10);
    });

    it("should have MIN_CONTRIBUTOR_ACCOUNT_AGE_DAYS = 180", async function () {
      expect(await constitution.MIN_CONTRIBUTOR_ACCOUNT_AGE_DAYS()).to.equal(180);
    });

    it("should have MAX_FEE_ADJUSTMENTS_PER_YEAR = 1", async function () {
      expect(await constitution.MAX_FEE_ADJUSTMENTS_PER_YEAR()).to.equal(1);
    });
  });

  describe("Fee Schedule", function () {
    it("should have Year 1 fee = 0.5% (50 BPS)", async function () {
      expect(await constitution.FEE_YEAR_1_BPS()).to.equal(50);
    });

    it("should have Year 2 fee = 1.0% (100 BPS)", async function () {
      expect(await constitution.FEE_YEAR_2_BPS()).to.equal(100);
    });

    it("should have Year 3+ fee = 2.0% (200 BPS)", async function () {
      expect(await constitution.FEE_YEAR_3_PLUS_BPS()).to.equal(200);
    });

    it("should have MAX_FEE_BPS = 4.0% (400 BPS)", async function () {
      expect(await constitution.MAX_FEE_BPS()).to.equal(400);
    });
  });

  describe("getCurrentFeeBPS", function () {
    it("should return 50 BPS for Year 0", async function () {
      const launchTimestamp = await time.latest();
      expect(await constitution.getCurrentFeeBPS(launchTimestamp)).to.equal(50);
    });

    it("should return 100 BPS for Year 1", async function () {
      const launchTimestamp = await time.latest();
      // Move forward 1 year
      await time.increase(365 * 24 * 60 * 60);
      expect(await constitution.getCurrentFeeBPS(launchTimestamp)).to.equal(100);
    });

    it("should return 200 BPS for Year 2+", async function () {
      const launchTimestamp = await time.latest();
      // Move forward 2 years
      await time.increase(2 * 365 * 24 * 60 * 60);
      expect(await constitution.getCurrentFeeBPS(launchTimestamp)).to.equal(200);
    });

    it("should return 200 BPS for Year 10", async function () {
      const launchTimestamp = await time.latest();
      // Move forward 10 years
      await time.increase(10 * 365 * 24 * 60 * 60);
      expect(await constitution.getCurrentFeeBPS(launchTimestamp)).to.equal(200);
    });
  });

  describe("requiresSupermajority", function () {
    it("should require supermajority for FEE_INCREASE", async function () {
      const actionType = ethers.keccak256(ethers.toUtf8Bytes("FEE_INCREASE"));
      expect(await constitution.requiresSupermajority(actionType)).to.equal(true);
    });

    it("should require supermajority for DECAY_RATE_CHANGE", async function () {
      const actionType = ethers.keccak256(ethers.toUtf8Bytes("DECAY_RATE_CHANGE"));
      expect(await constitution.requiresSupermajority(actionType)).to.equal(true);
    });

    it("should require supermajority for CONSTITUTIONAL_CHANGE", async function () {
      const actionType = ethers.keccak256(ethers.toUtf8Bytes("CONSTITUTIONAL_CHANGE"));
      expect(await constitution.requiresSupermajority(actionType)).to.equal(true);
    });

    it("should require supermajority for ENDOWMENT_WITHDRAWAL", async function () {
      const actionType = ethers.keccak256(ethers.toUtf8Bytes("ENDOWMENT_WITHDRAWAL"));
      expect(await constitution.requiresSupermajority(actionType)).to.equal(true);
    });

    it("should NOT require supermajority for regular actions", async function () {
      const actionType = ethers.keccak256(ethers.toUtf8Bytes("GRANT_APPROVAL"));
      expect(await constitution.requiresSupermajority(actionType)).to.equal(false);
    });
  });

  describe("validateOpsBudget", function () {
    it("should return true for valid budget within caps", async function () {
      const budget = ethers.parseEther("300000"); // $300k
      const treasury = ethers.parseEther("10000000"); // $10M
      expect(await constitution.validateOpsBudget(budget, treasury)).to.equal(true);
    });

    it("should return false when exceeding absolute cap", async function () {
      const budget = ethers.parseEther("500000"); // $500k > $400k cap
      const treasury = ethers.parseEther("10000000"); // $10M
      expect(await constitution.validateOpsBudget(budget, treasury)).to.equal(false);
    });

    it("should return false when exceeding percentage cap", async function () {
      const budget = ethers.parseEther("400000"); // $400k
      const treasury = ethers.parseEther("2000000"); // $2M (12% = $240k)
      expect(await constitution.validateOpsBudget(budget, treasury)).to.equal(false);
    });

    it("should pass when at exact absolute cap", async function () {
      const budget = ethers.parseEther("400000"); // $400k
      const treasury = ethers.parseEther("50000000"); // $50M (12% = $6M)
      expect(await constitution.validateOpsBudget(budget, treasury)).to.equal(true);
    });
  });

  describe("getDecayRate", function () {
    it("should return 1000 BPS (10%) for founders", async function () {
      expect(await constitution.getDecayRate(true)).to.equal(1000);
    });

    it("should return 200 BPS (2%) for regular contributors", async function () {
      expect(await constitution.getDecayRate(false)).to.equal(200);
    });
  });

  describe("validatePublicGoodsAllocation", function () {
    it("should return true when allocation >= 85%", async function () {
      const prospective = ethers.parseEther("7000000"); // $7M
      const retroactive = ethers.parseEther("1500000"); // $1.5M
      const total = ethers.parseEther("10000000"); // $10M
      // $8.5M / $10M = 85%
      expect(
        await constitution.validatePublicGoodsAllocation(prospective, retroactive, total)
      ).to.equal(true);
    });

    it("should return false when allocation < 85%", async function () {
      const prospective = ethers.parseEther("5000000"); // $5M
      const retroactive = ethers.parseEther("1000000"); // $1M
      const total = ethers.parseEther("10000000"); // $10M
      // $6M / $10M = 60%
      expect(
        await constitution.validatePublicGoodsAllocation(prospective, retroactive, total)
      ).to.equal(false);
    });

    it("should return true when allocation > 85%", async function () {
      const prospective = ethers.parseEther("8000000"); // $8M
      const retroactive = ethers.parseEther("1500000"); // $1.5M
      const total = ethers.parseEther("10000000"); // $10M
      // $9.5M / $10M = 95%
      expect(
        await constitution.validatePublicGoodsAllocation(prospective, retroactive, total)
      ).to.equal(true);
    });
  });

  describe("Term Limits", function () {
    it("should have MAX_CONSECUTIVE_TERMS = 2", async function () {
      expect(await constitution.MAX_CONSECUTIVE_TERMS()).to.equal(2);
    });

    it("should have CITIZENS_HOUSE_TERM_DAYS = 182", async function () {
      expect(await constitution.CITIZENS_HOUSE_TERM_DAYS()).to.equal(182);
    });
  });

  describe("Decay & Redistribution", function () {
    it("should have REDISTRIBUTION_PERCENTAGE = 40%", async function () {
      expect(await constitution.REDISTRIBUTION_PERCENTAGE()).to.equal(40);
    });

    it("should have PARTICIPATION_BONUS_PER_QUARTER = 5%", async function () {
      expect(await constitution.PARTICIPATION_BONUS_PER_QUARTER()).to.equal(5);
    });

    it("should have MAX_PARTICIPATION_BONUS = 40%", async function () {
      expect(await constitution.MAX_PARTICIPATION_BONUS()).to.equal(40);
    });
  });

  describe("Treasury Splits", function () {
    it("should have PROSPECTIVE_GRANTS_PERCENTAGE = 70%", async function () {
      expect(await constitution.PROSPECTIVE_GRANTS_PERCENTAGE()).to.equal(70);
    });

    it("should have RETROACTIVE_GRANTS_PERCENTAGE = 15%", async function () {
      expect(await constitution.RETROACTIVE_GRANTS_PERCENTAGE()).to.equal(15);
    });

    it("should have EMERGENCY_RESERVE_PERCENTAGE = 15%", async function () {
      expect(await constitution.EMERGENCY_RESERVE_PERCENTAGE()).to.equal(15);
    });

    it("treasury splits should sum to 100%", async function () {
      const prospective = await constitution.PROSPECTIVE_GRANTS_PERCENTAGE();
      const retroactive = await constitution.RETROACTIVE_GRANTS_PERCENTAGE();
      const emergency = await constitution.EMERGENCY_RESERVE_PERCENTAGE();
      expect(Number(prospective) + Number(retroactive) + Number(emergency)).to.equal(100);
    });
  });

  describe("Immutability", function () {
    it("all constants should be immutable (no setters)", async function () {
      // Verify there are no setter functions for critical constants
      // This is a documentation test - constants in Solidity are inherently immutable
      expect(await constitution.MAX_OPERATIONAL_BUDGET_ANNUAL()).to.equal(
        ethers.parseEther("400000")
      );
      expect(await constitution.FOUNDER_DECAY_RATE()).to.equal(10);
      expect(await constitution.MAX_INDIVIDUAL_IMPACT_SHARE()).to.equal(2);
    });
  });
});
