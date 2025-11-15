// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Constitution
 * @author Public Goods DAO
 * @notice Immutable constitutional invariants that govern the DAO
 * @dev These values CANNOT be changed by governance votes - they are permanently enshrined
 *
 * This contract implements the non-extractive principles defined in TOKEN_MODEL_SPEC_V2.md
 * Section 13: "Constitutional Invariants (Immutable On-Chain) - EXPANDED"
 *
 * Security Consideration: All values are immutable constants to prevent governance capture
 */
contract Constitution {
    /*//////////////////////////////////////////////////////////////
                              MISSION
    //////////////////////////////////////////////////////////////*/

    /// @notice The immutable mission of the DAO
    string public constant MISSION = "Fund public goods through non-extractive mechanisms";

    /*//////////////////////////////////////////////////////////////
                        FINANCIAL INVARIANTS
    //////////////////////////////////////////////////////////////*/

    /// @notice Minimum percentage of treasury that must go to public goods grants (prospective + retroactive)
    /// @dev 85% = 70% prospective + 15% retroactive (V2 allocation)
    uint256 public constant MIN_PUBLIC_GOODS_ALLOCATION = 85;

    /// @notice Maximum annual operational budget in USD (absolute cap, not percentage)
    /// @dev $400,000/year regardless of treasury size - prevents extractive expansion
    uint256 public constant MAX_OPERATIONAL_BUDGET_ANNUAL = 400_000e18; // 400k USD in 18 decimals

    /// @notice Minimum endowment size required before scaling grants beyond $3M/year
    /// @dev $2M endowment provides perpetual yield safety buffer
    uint256 public constant MIN_ENDOWMENT_SIZE = 2_000_000e18; // 2M USD

    /// @notice Maximum percentage of treasury that can go to operations
    /// @dev Even with this percentage, absolute cap takes precedence
    uint256 public constant MAX_OPERATIONAL_PERCENTAGE = 12;

    /*//////////////////////////////////////////////////////////////
                          TOKEN INVARIANTS
    //////////////////////////////////////////////////////////////*/

    /// @notice IMPACT tokens are non-transferable (soulbound)
    bool public constant IMPACT_TRANSFERABLE = false;

    /// @notice Wealth-based voting (proof-of-stake) is prohibited
    bool public constant WEALTH_BASED_VOTING_ALLOWED = false;

    /// @notice Profit extraction to external parties is prohibited
    bool public constant PROFIT_EXTRACTION_ALLOWED = false;

    /*//////////////////////////////////////////////////////////////
                       GOVERNANCE INVARIANTS
    //////////////////////////////////////////////////////////////*/

    /// @notice Maximum percentage of total IMPACT supply one entity can hold
    /// @dev 2% cap prevents whale dominance
    uint256 public constant MAX_INDIVIDUAL_IMPACT_SHARE = 2;

    /// @notice Quarterly decay rate for founder IMPACT (accelerated)
    /// @dev 10% per quarter = 34.4% annually (immutable, cannot be reduced)
    uint256 public constant FOUNDER_DECAY_RATE = 10;

    /// @notice Base quarterly decay rate for regular contributors
    /// @dev 2% per quarter = 7.8% annually
    uint256 public constant BASE_DECAY_RATE = 2;

    /// @notice Maximum number of founders allowed in Citizens' House simultaneously
    /// @dev Anti-nepotism rule: max 2 of 50-100 seats
    uint256 public constant MAX_FOUNDERS_IN_CITIZENS_HOUSE = 2;

    /// @notice Minimum IMPACT required to propose governance changes
    uint256 public constant MIN_IMPACT_TO_PROPOSE = 10_000e18;

    /// @notice Minimum IMPACT required to nominate a Citizens' House candidate
    uint256 public constant MIN_IMPACT_TO_NOMINATE = 1_000e18;

    /// @notice Quorum requirement as percentage of active IMPACT
    /// @dev Increased from 10% to 25% in V2
    uint256 public constant QUORUM_PERCENTAGE = 25;

    /// @notice Supermajority threshold for critical governance actions
    /// @dev 67% required for constitutional changes, fee increases, etc.
    uint256 public constant SUPERMAJORITY_THRESHOLD = 67;

    /*//////////////////////////////////////////////////////////////
                    ANTI-EXTRACTION INVARIANTS
    //////////////////////////////////////////////////////////////*/

    /// @notice Conflict-of-interest disclosure is mandatory for Citizens' House
    bool public constant CONFLICT_DISCLOSURE_REQUIRED = true;

    /// @notice Maximum matching multiplier for quadratic funding
    /// @dev 10x cap prevents infinite Sybil ROI
    uint256 public constant MATCHING_MULTIPLIER_CAP = 10;

    /// @notice Minimum account age in days before contributing to QF rounds
    /// @dev 180 days (6 months) raises Sybil attack cost
    uint256 public constant MIN_CONTRIBUTOR_ACCOUNT_AGE_DAYS = 180;

    /// @notice Maximum times fees can be adjusted per year
    /// @dev Prevents iterative fee gaming
    uint256 public constant MAX_FEE_ADJUSTMENTS_PER_YEAR = 1;

    /// @notice Maximum emergency pause duration in days
    /// @dev Citizens' House can pause for max 14 days
    uint256 public constant MAX_PAUSE_DURATION_DAYS = 14;

    /// @notice Maximum number of pauses allowed per year before re-election
    /// @dev If >3 pauses/year, triggers Citizens' House re-election
    uint256 public constant MAX_PAUSES_PER_YEAR = 3;

    /*//////////////////////////////////////////////////////////////
                         DECAY & REDISTRIBUTION
    //////////////////////////////////////////////////////////////*/

    /// @notice Percentage of decayed IMPACT that gets redistributed (rest is burned)
    /// @dev 40% redistributed to bottom 50% of active contributors
    uint256 public constant REDISTRIBUTION_PERCENTAGE = 40;

    /// @notice Participation bonus per consecutive quarter of voting
    /// @dev 5% per quarter, offsets decay for active participants
    uint256 public constant PARTICIPATION_BONUS_PER_QUARTER = 5;

    /// @notice Maximum participation bonus (caps at 8 quarters)
    /// @dev Max 40% bonus after 8 consecutive quarters
    uint256 public constant MAX_PARTICIPATION_BONUS = 40;

    /*//////////////////////////////////////////////////////////////
                          TREASURY SPLITS
    //////////////////////////////////////////////////////////////*/

    /// @notice Percentage of treasury allocated to prospective grants
    uint256 public constant PROSPECTIVE_GRANTS_PERCENTAGE = 70;

    /// @notice Percentage of treasury allocated to retroactive grants
    uint256 public constant RETROACTIVE_GRANTS_PERCENTAGE = 15;

    /// @notice Percentage of treasury allocated to emergency reserves
    uint256 public constant EMERGENCY_RESERVE_PERCENTAGE = 15;

    /*//////////////////////////////////////////////////////////////
                            FEE SCHEDULE
    //////////////////////////////////////////////////////////////*/

    /// @notice Platform fee for Year 1 (bootstrap phase)
    /// @dev 0.5% = 50 basis points
    uint256 public constant FEE_YEAR_1_BPS = 50; // 0.5%

    /// @notice Platform fee for Year 2 (growth phase)
    /// @dev 1.0% = 100 basis points
    uint256 public constant FEE_YEAR_2_BPS = 100; // 1.0%

    /// @notice Platform fee for Year 3+ (mature phase)
    /// @dev 2.0% = 200 basis points
    uint256 public constant FEE_YEAR_3_PLUS_BPS = 200; // 2.0%

    /// @notice Maximum platform fee that can be set via governance
    /// @dev Hard cap at 4% even with supermajority vote
    uint256 public constant MAX_FEE_BPS = 400; // 4.0%

    /*//////////////////////////////////////////////////////////////
                          TERM LIMITS
    //////////////////////////////////////////////////////////////*/

    /// @notice Maximum consecutive terms for Citizens' House members
    /// @dev Prevents entrenchment
    uint256 public constant MAX_CONSECUTIVE_TERMS = 2;

    /// @notice Citizens' House term duration in days
    /// @dev 6 months = ~182 days
    uint256 public constant CITIZENS_HOUSE_TERM_DAYS = 182;

    /*//////////////////////////////////////////////////////////////
                          HELPER FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Calculate current platform fee based on DAO age
     * @param daoLaunchTimestamp Timestamp when DAO was launched
     * @return feeBPS Current fee in basis points (1 bps = 0.01%)
     * @dev Implements progressive fee schedule from V2 spec
     */
    function getCurrentFeeBPS(uint256 daoLaunchTimestamp) public view returns (uint256 feeBPS) {
        uint256 daoAgeYears = (block.timestamp - daoLaunchTimestamp) / 365 days;

        if (daoAgeYears == 0) {
            return FEE_YEAR_1_BPS; // 0.5%
        } else if (daoAgeYears == 1) {
            return FEE_YEAR_2_BPS; // 1.0%
        } else {
            return FEE_YEAR_3_PLUS_BPS; // 2.0%
        }
    }

    /**
     * @notice Check if a governance action requires supermajority
     * @param actionType Type of governance action
     * @return bool True if supermajority required
     * @dev Critical actions require 67% supermajority
     */
    function requiresSupermajority(bytes32 actionType) public pure returns (bool) {
        // Actions requiring 67% supermajority
        if (
            actionType == keccak256("FEE_INCREASE") ||
            actionType == keccak256("DECAY_RATE_CHANGE") ||
            actionType == keccak256("QUORUM_CHANGE") ||
            actionType == keccak256("CONSTITUTIONAL_CHANGE") ||
            actionType == keccak256("ENDOWMENT_WITHDRAWAL")
        ) {
            return true;
        }
        return false;
    }

    /**
     * @notice Validate that ops budget proposal complies with constitutional caps
     * @param proposedAnnualBudget Proposed annual budget in USD (18 decimals)
     * @param treasurySize Current treasury size in USD (18 decimals)
     * @return bool True if proposal is valid
     * @dev Both absolute cap AND percentage cap must be satisfied
     */
    function validateOpsBudget(
        uint256 proposedAnnualBudget,
        uint256 treasurySize
    ) public pure returns (bool) {
        // Check absolute cap
        if (proposedAnnualBudget > MAX_OPERATIONAL_BUDGET_ANNUAL) {
            return false;
        }

        // Check percentage cap
        uint256 maxPercentageBudget = (treasurySize * MAX_OPERATIONAL_PERCENTAGE) / 100;
        if (proposedAnnualBudget > maxPercentageBudget) {
            return false;
        }

        return true;
    }

    /**
     * @notice Calculate decay rate for a given account
     * @param isFounder True if account is a founder
     * @return decayRate Decay rate in basis points (e.g., 200 = 2%)
     * @dev Founders decay at 10%/quarter, regular contributors at 2%/quarter
     */
    function getDecayRate(bool isFounder) public pure returns (uint256 decayRate) {
        return isFounder ? FOUNDER_DECAY_RATE * 100 : BASE_DECAY_RATE * 100; // Convert to basis points
    }

    /**
     * @notice Check if public goods allocation requirement is met
     * @param prospectiveAmount Amount allocated to prospective grants
     * @param retroactiveAmount Amount allocated to retroactive grants
     * @param totalTreasury Total treasury size
     * @return bool True if allocation is valid
     * @dev Prospective + Retroactive must be >= 85% of total
     */
    function validatePublicGoodsAllocation(
        uint256 prospectiveAmount,
        uint256 retroactiveAmount,
        uint256 totalTreasury
    ) public pure returns (bool) {
        uint256 publicGoodsTotal = prospectiveAmount + retroactiveAmount;
        uint256 requiredMinimum = (totalTreasury * MIN_PUBLIC_GOODS_ALLOCATION) / 100;

        return publicGoodsTotal >= requiredMinimum;
    }
}
