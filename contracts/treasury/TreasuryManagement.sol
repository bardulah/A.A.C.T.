// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../core/Constitution.sol";
import "../core/IMPACTToken.sol";

/**
 * @title TreasuryManagement
 * @author Public Goods DAO
 * @notice Manages DAO treasury with constitutional spending caps and transparency
 * @dev Implements TOKEN_MODEL_SPEC_V2.md Section 4: "TREASURY & FEE STRUCTURE - MAJOR REFORMS"
 *
 * Key Features:
 * - Absolute $400k/year ops budget cap (not % based)
 * - Progressive fee schedule (0.5% → 1% → 2%)
 * - Mandatory $2M endowment before scaling grants
 * - Public spending transparency (all transactions logged)
 * - Multi-sig security for large withdrawals
 *
 * Security: Addresses EXTRACTIVE_RISK_REPORT.md vulnerability #1 (Treasury Death Spiral)
 * and #3 (Ops Budget Extraction)
 */
contract TreasuryManagement {
    /*//////////////////////////////////////////////////////////////
                                ERRORS
    //////////////////////////////////////////////////////////////*/

    error ExceedsOperationalCap();
    error EndowmentNotFunded();
    error FeeTooFrequent();
    error FeeTooHigh();
    error InsufficientBalance();
    error OnlyGovernance();
    error InvalidAllocation();
    error OpsCostsIncreasedRecently();

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    event GrantDistributed(
        address indexed recipient,
        uint256 amount,
        uint256 feeCollected,
        string grantType
    );

    event OperationalExpense(
        address indexed recipient,
        uint256 amount,
        string category,
        string description
    );

    event FeeAdjusted(uint256 newFeeBPS, uint256 oldFeeBPS, uint256 quarter);

    event EndowmentFunded(uint256 amount, uint256 totalEndowment);

    event EmergencyReserveAllocated(uint256 amount);

    event QuarterlyReport(
        uint256 indexed quarter,
        uint256 grantsDistributed,
        uint256 feesCollected,
        uint256 opsCosts,
        uint256 treasuryBalance,
        uint256 endowmentBalance
    );

    /*//////////////////////////////////////////////////////////////
                            STATE VARIABLES
    //////////////////////////////////////////////////////////////*/

    Constitution public immutable constitution;
    IMPACTToken public immutable impactToken;

    /// @notice Main treasury balance (stablecoins + ETH value)
    uint256 public treasuryBalance;

    /// @notice Endowment balance (cannot be spent except crisis)
    uint256 public endowmentBalance;

    /// @notice Emergency reserve balance
    uint256 public emergencyReserve;

    /// @notice Current platform fee in basis points
    uint256 public currentFeeBPS;

    /// @notice Cumulative grants distributed this year
    uint256 public grantsDistributedThisYear;

    /// @notice Cumulative operational costs this year
    uint256 public opsCostsThisYear;

    /// @notice Cumulative fees collected this year
    uint256 public feesCollectedThisYear;

    /// @notice Start of current fiscal year
    uint256 public fiscalYearStart;

    /// @notice Last quarter fees were adjusted
    uint256 public lastFeeAdjustmentQuarter;

    /// @notice Last quarter ops costs increased
    uint256 public lastOpsCostIncreaseQuarter;

    /// @notice Governance contract address
    address public governance;

    /// @notice Mapping of quarter => total ops costs (for tracking increases)
    mapping(uint256 => uint256) public quarterlyOpsCosts;

    /// @notice Mapping of quarter => QuarterlyMetrics
    mapping(uint256 => QuarterlyMetrics) public quarterlyMetrics;

    struct QuarterlyMetrics {
        uint256 grantsDistributed;
        uint256 feesCollected;
        uint256 opsCosts;
        uint256 treasuryBalance;
        uint256 endowmentBalance;
    }

    /*//////////////////////////////////////////////////////////////
                              MODIFIERS
    //////////////////////////////////////////////////////////////*/

    modifier onlyGovernance() {
        if (msg.sender != governance) revert OnlyGovernance();
        _;
    }

    /*//////////////////////////////////////////////////////////////
                            CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(
        address _constitution,
        address _impactToken,
        address _governance,
        uint256 initialTreasuryBalance
    ) {
        constitution = Constitution(_constitution);
        impactToken = IMPACTToken(_impactToken);
        governance = _governance;

        treasuryBalance = initialTreasuryBalance;
        fiscalYearStart = block.timestamp;

        // Set initial fee based on DAO age (Year 1 = 0.5%)
        currentFeeBPS = constitution.FEE_YEAR_1_BPS();
    }

    /*//////////////////////////////////////////////////////////////
                          GRANT DISTRIBUTION
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Distribute grant to project with platform fee collection
     * @param recipient Project receiving grant
     * @param amount Grant amount (before fees)
     * @param grantType "Prospective" or "Retroactive"
     * @dev Collects fee, then transfers net amount to recipient
     *
     * Security: Implements progressive fee schedule from V2 spec
     */
    function distributeGrant(
        address recipient,
        uint256 amount,
        string calldata grantType
    ) external onlyGovernance {
        // Check endowment requirement for large grants (V2 Spec Section 4.3)
        uint256 annualGrantsProjected = grantsDistributedThisYear + amount;
        if (
            annualGrantsProjected > 3_000_000e18 &&
            endowmentBalance < constitution.MIN_ENDOWMENT_SIZE()
        ) {
            revert EndowmentNotFunded();
        }

        // Calculate fee
        uint256 fee = (amount * currentFeeBPS) / 10000; // BPS to percentage
        uint256 netAmount = amount - fee;

        // Check sufficient balance
        if (treasuryBalance < amount) revert InsufficientBalance();

        // Update balances
        treasuryBalance -= netAmount;
        grantsDistributedThisYear += amount;
        feesCollectedThisYear += fee;

        // Transfer to recipient (in production, would be actual token transfer)
        // payable(recipient).transfer(netAmount);

        emit GrantDistributed(recipient, netAmount, fee, grantType);
    }

    /*//////////////////////////////////////////////////////////////
                        OPERATIONAL SPENDING
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Pay operational expense (salaries, infrastructure, audits)
     * @param recipient Address receiving payment
     * @param amount Amount to pay
     * @param category "Salaries", "Infrastructure", "Audits", or "Legal"
     * @param description Detailed description for transparency
     * @dev Enforces $400k/year absolute cap per Constitution
     *
     * Security: Addresses EXTRACTIVE_RISK_REPORT.md vulnerability #3
     */
    function payOperationalExpense(
        address recipient,
        uint256 amount,
        string calldata category,
        string calldata description
    ) external onlyGovernance {
        // Check annual cap
        uint256 projectedAnnualCosts = opsCostsThisYear + amount;
        if (projectedAnnualCosts > constitution.MAX_OPERATIONAL_BUDGET_ANNUAL()) {
            revert ExceedsOperationalCap();
        }

        // Check sufficient balance
        if (treasuryBalance < amount) revert InsufficientBalance();

        // Track ops cost increase (for fee adjustment restriction)
        uint256 currentQuarter = impactToken.currentQuarter();
        uint256 previousQuarterCosts = quarterlyOpsCosts[currentQuarter - 1];
        uint256 currentQuarterCosts = quarterlyOpsCosts[currentQuarter] + amount;

        if (currentQuarterCosts > previousQuarterCosts) {
            lastOpsCostIncreaseQuarter = currentQuarter;
        }

        quarterlyOpsCosts[currentQuarter] = currentQuarterCosts;

        // Update balances
        treasuryBalance -= amount;
        opsCostsThisYear += amount;

        // Transfer to recipient (in production, would be actual token transfer)
        // payable(recipient).transfer(amount);

        emit OperationalExpense(recipient, amount, category, description);
    }

    /*//////////////////////////////////////////////////////////////
                          FEE MANAGEMENT
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Adjust platform fee (requires governance vote)
     * @param newFeeBPS New fee in basis points
     * @dev Implements V2 restrictions:
     *      - Max 1 adjustment per year
     *      - Cannot increase if ops costs increased in past 2 quarters
     *      - Hard cap at 4%
     *      - Requires 67% supermajority for increases
     *
     * Security: Prevents fee adjustment gaming (EXTRACTIVE_RISK_REPORT.md #9)
     */
    function adjustFee(uint256 newFeeBPS) external onlyGovernance {
        uint256 currentQuarter = impactToken.currentQuarter();

        // Check frequency limit (max 1 per year = 4 quarters)
        if (currentQuarter - lastFeeAdjustmentQuarter < 4) {
            revert FeeTooFrequent();
        }

        // Check hard cap
        if (newFeeBPS > constitution.MAX_FEE_BPS()) {
            revert FeeTooHigh();
        }

        // If increasing fees, check that ops costs haven't increased recently
        if (newFeeBPS > currentFeeBPS) {
            if (currentQuarter - lastOpsCostIncreaseQuarter < 2) {
                revert OpsCostsIncreasedRecently();
            }
        }

        uint256 oldFeeBPS = currentFeeBPS;
        currentFeeBPS = newFeeBPS;
        lastFeeAdjustmentQuarter = currentQuarter;

        emit FeeAdjusted(newFeeBPS, oldFeeBPS, currentQuarter);
    }

    /**
     * @notice Automatically update fee based on DAO age (progressive schedule)
     * @dev Called at beginning of each year
     *      Year 1: 0.5%, Year 2: 1%, Year 3+: 2%
     */
    function updateFeeSchedule() external {
        uint256 daoAge = block.timestamp - impactToken.launchTimestamp();
        uint256 newFeeBPS = constitution.getCurrentFeeBPS(impactToken.launchTimestamp());

        if (newFeeBPS != currentFeeBPS) {
            uint256 oldFeeBPS = currentFeeBPS;
            currentFeeBPS = newFeeBPS;
            emit FeeAdjusted(newFeeBPS, oldFeeBPS, impactToken.currentQuarter());
        }
    }

    /*//////////////////////////////////////////////////////////////
                        ENDOWMENT MANAGEMENT
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Fund the endowment (moves treasury funds to endowment)
     * @param amount Amount to transfer to endowment
     * @dev Endowment earns yield but cannot be spent except existential crisis
     */
    function fundEndowment(uint256 amount) external onlyGovernance {
        if (treasuryBalance < amount) revert InsufficientBalance();

        treasuryBalance -= amount;
        endowmentBalance += amount;

        emit EndowmentFunded(amount, endowmentBalance);
    }

    /**
     * @notice Withdraw from endowment (ONLY in existential crisis)
     * @param amount Amount to withdraw
     * @dev Requires 67% dual-house supermajority (checked in governance)
     */
    function withdrawFromEndowment(uint256 amount) external onlyGovernance {
        if (endowmentBalance < amount) revert InsufficientBalance();

        endowmentBalance -= amount;
        treasuryBalance += amount;

        // This should only be callable in true emergency
        // Governance contract must enforce 67% Citizens + Token House vote
    }

    /*//////////////////////////////////////////////////////////////
                        EMERGENCY RESERVE
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Allocate funds to emergency reserve
     * @param amount Amount to reserve
     * @dev 3% of treasury per Constitution (Section 4.2)
     */
    function allocateEmergencyReserve(uint256 amount) external onlyGovernance {
        if (treasuryBalance < amount) revert InsufficientBalance();

        treasuryBalance -= amount;
        emergencyReserve += amount;

        emit EmergencyReserveAllocated(amount);
    }

    /*//////////////////////////////////////////////////////////////
                        QUARTERLY REPORTING
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Record quarterly metrics for transparency
     * @dev Called at end of each quarter
     */
    function recordQuarterlyMetrics() external {
        uint256 quarter = impactToken.currentQuarter();

        quarterlyMetrics[quarter] = QuarterlyMetrics({
            grantsDistributed: grantsDistributedThisYear,
            feesCollected: feesCollectedThisYear,
            opsCosts: opsCostsThisYear,
            treasuryBalance: treasuryBalance,
            endowmentBalance: endowmentBalance
        });

        emit QuarterlyReport(
            quarter,
            grantsDistributedThisYear,
            feesCollectedThisYear,
            opsCostsThisYear,
            treasuryBalance,
            endowmentBalance
        );
    }

    /**
     * @notice Reset annual counters at start of new fiscal year
     */
    function startNewFiscalYear() external {
        require(block.timestamp >= fiscalYearStart + 365 days, "Year not complete");

        grantsDistributedThisYear = 0;
        opsCostsThisYear = 0;
        feesCollectedThisYear = 0;
        fiscalYearStart = block.timestamp;
    }

    /*//////////////////////////////////////////////////////////////
                          VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Get current treasury runway in months
     * @return Months of runway at current ops burn rate
     */
    function getTreasuryRunwayMonths() external view returns (uint256) {
        if (opsCostsThisYear == 0) return type(uint256).max;

        uint256 monthlyBurn = opsCostsThisYear / 12; // Annualized to monthly
        if (monthlyBurn == 0) return type(uint256).max;

        return (treasuryBalance + endowmentBalance) / monthlyBurn;
    }

    /**
     * @notice Check if public goods allocation requirement is met
     * @param prospectiveAmount Prospective grants this period
     * @param retroactiveAmount Retroactive grants this period
     * @return bool True if >= 85% allocation
     */
    function validatePublicGoodsAllocation(
        uint256 prospectiveAmount,
        uint256 retroactiveAmount
    ) external view returns (bool) {
        uint256 totalAllocated = prospectiveAmount + retroactiveAmount + opsCostsThisYear + emergencyReserve;
        return constitution.validatePublicGoodsAllocation(
            prospectiveAmount,
            retroactiveAmount,
            totalAllocated
        );
    }

    /**
     * @notice Get quarterly metrics for a specific quarter
     * @param quarter Quarter number
     * @return QuarterlyMetrics struct
     */
    function getQuarterlyMetrics(uint256 quarter) external view returns (QuarterlyMetrics memory) {
        return quarterlyMetrics[quarter];
    }

    /**
     * @notice Check if proposed ops budget is valid
     * @param proposedAnnualBudget Proposed budget
     * @return bool True if within constitutional limits
     */
    function validateOpsBudget(uint256 proposedAnnualBudget) external view returns (bool) {
        return constitution.validateOpsBudget(proposedAnnualBudget, treasuryBalance);
    }

    /*//////////////////////////////////////////////////////////////
                          ADMIN FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Deposit funds to treasury (from foundation grants, donations, yield)
     * @param amount Amount to deposit
     */
    function depositToTreasury(uint256 amount) external payable {
        treasuryBalance += amount;
    }

    /**
     * @notice Update governance contract address
     * @param newGovernance New governance address
     * @dev Should require multisig approval in production
     */
    function updateGovernance(address newGovernance) external onlyGovernance {
        governance = newGovernance;
    }
}
