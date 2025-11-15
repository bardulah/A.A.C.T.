// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Constitution.sol";

/**
 * @title IMPACTToken
 * @author Public Goods DAO
 * @notice Soulbound (non-transferable) governance token with decay and redistribution
 * @dev Implements TOKEN_MODEL_SPEC_V2.md Section 2.1: "IMPACT Token (Non-Transferable Governance)"
 *
 * Key Features:
 * - Non-transferable (soulbound) to prevent financialization
 * - Multi-dimensional reputation (Builder, Curator, Community)
 * - Quarterly decay with redistribution to bottom 50%
 * - Founder accelerated decay (10%/qtr vs 2%/qtr)
 * - Individual holding caps (2% of supply max)
 * - Participation bonuses for active governance
 *
 * Security: Addresses EXTRACTIVE_RISK_REPORT.md vulnerabilities #2 (Founder Entrenchment),
 * #4 (Gini Breach), #6 (Voter Apathy)
 */
contract IMPACTToken {
    /*//////////////////////////////////////////////////////////////
                                 ERRORS
    //////////////////////////////////////////////////////////////*/

    error TransferNotAllowed();
    error ExceedsIndividualCap(uint256 requested, uint256 cap);
    error OnlyMinter();
    error OnlyDecayExecutor();
    error AccountNotFound();
    error InvalidReputationCategory();

    /*//////////////////////////////////////////////////////////////
                                 EVENTS
    //////////////////////////////////////////////////////////////*/

    event IMPACTMinted(
        address indexed account,
        ReputationCategory category,
        uint256 amount,
        string reason
    );

    event DecayExecuted(
        uint256 indexed quarter,
        uint256 totalDecayed,
        uint256 totalRedistributed
    );

    event ReputationUpdated(
        address indexed account,
        ReputationCategory category,
        uint256 newAmount,
        uint256 totalIMPACT
    );

    event FounderStatusSet(address indexed account, bool isFounder);

    event ParticipationBonusUpdated(address indexed account, uint256 consecutiveQuarters);

    event ShadowTradingFlagged(address indexed account, string reason);

    /*//////////////////////////////////////////////////////////////
                                 ENUMS
    //////////////////////////////////////////////////////////////*/

    enum ReputationCategory {
        Builder,   // Code/product contributions
        Curator,   // Grant review work
        Community  // Events, education, content
    }

    /*//////////////////////////////////////////////////////////////
                                STRUCTS
    //////////////////////////////////////////////////////////////*/

    struct Account {
        uint256 builderRep;
        uint256 curatorRep;
        uint256 communityRep;
        uint256 lastDecayQuarter;
        uint256 joinedQuarter;
        uint256 consecutiveVotingQuarters;
        bool isFounder;
        bool isActive;
        bool isFlagged; // Shadow trading detection
    }

    /*//////////////////////////////////////////////////////////////
                            STATE VARIABLES
    //////////////////////////////////////////////////////////////*/

    /// @notice Reference to constitutional invariants
    Constitution public immutable constitution;

    /// @notice Authorized minter (ReputationRegistry contract)
    address public minter;

    /// @notice Authorized decay executor (automated or governance-controlled)
    address public decayExecutor;

    /// @notice Current quarter (increments every ~91 days)
    uint256 public currentQuarter;

    /// @notice Timestamp when DAO launched (quarter 0)
    uint256 public immutable launchTimestamp;

    /// @notice Total IMPACT supply (sum of all reputation)
    uint256 public totalSupply;

    /// @notice Account data mapping
    mapping(address => Account) public accounts;

    /// @notice List of all accounts (for redistribution calculations)
    address[] public accountList;

    /// @notice Mapping for efficient account existence checks
    mapping(address => bool) public accountExists;

    /// @notice New contributor bonus multiplier end quarter
    mapping(address => uint256) public bonusEndQuarter;

    /// @notice Last quarter fees were adjusted (for fee adjustment limits)
    uint256 public lastFeeAdjustmentQuarter;

    /*//////////////////////////////////////////////////////////////
                               MODIFIERS
    //////////////////////////////////////////////////////////////*/

    modifier onlyMinter() {
        if (msg.sender != minter) revert OnlyMinter();
        _;
    }

    modifier onlyDecayExecutor() {
        if (msg.sender != decayExecutor) revert OnlyDecayExecutor();
        _;
    }

    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(address _constitution) {
        constitution = Constitution(_constitution);
        launchTimestamp = block.timestamp;
        currentQuarter = 0;
    }

    /*//////////////////////////////////////////////////////////////
                          ADMIN FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Set the authorized minter contract
     * @param _minter Address of ReputationRegistry contract
     * @dev Should be called once during deployment
     */
    function setMinter(address _minter) external {
        require(minter == address(0), "Minter already set");
        minter = _minter;
    }

    /**
     * @notice Set the decay executor
     * @param _executor Address authorized to execute quarterly decay
     */
    function setDecayExecutor(address _executor) external {
        require(decayExecutor == address(0), "Executor already set");
        decayExecutor = _executor;
    }

    /*//////////////////////////////////////////////////////////////
                          MINTING FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Mint IMPACT tokens to an account in a specific reputation category
     * @param account Address receiving IMPACT
     * @param category Reputation category (Builder, Curator, Community)
     * @param amount Amount of IMPACT to mint (18 decimals)
     * @param reason Human-readable reason for minting
     * @dev Called by ReputationRegistry based on verified contributions
     *
     * Security: Enforces individual cap (2% of supply) per Constitution
     */
    function mint(
        address account,
        ReputationCategory category,
        uint256 amount,
        string calldata reason
    ) external onlyMinter {
        // Initialize account if new
        if (!accountExists[account]) {
            accountList.push(account);
            accountExists[account] = true;
            accounts[account].joinedQuarter = currentQuarter;
            accounts[account].lastDecayQuarter = currentQuarter;
            accounts[account].isActive = true;

            // New contributor bonus: 2x for first 6 months (2 quarters)
            bonusEndQuarter[account] = currentQuarter + 2;
        }

        // Apply new contributor bonus if applicable
        uint256 mintAmount = amount;
        if (currentQuarter < bonusEndQuarter[account]) {
            mintAmount = amount * 2; // 2x multiplier
        }

        // Update reputation in specific category
        if (category == ReputationCategory.Builder) {
            accounts[account].builderRep += mintAmount;
        } else if (category == ReputationCategory.Curator) {
            accounts[account].curatorRep += mintAmount;
        } else if (category == ReputationCategory.Community) {
            accounts[account].communityRep += mintAmount;
        } else {
            revert InvalidReputationCategory();
        }

        // Update total supply
        totalSupply += mintAmount;

        // Enforce individual cap (2% of total supply)
        uint256 accountTotal = getTotalIMPACT(account);
        uint256 individualCap = (totalSupply * constitution.MAX_INDIVIDUAL_IMPACT_SHARE()) / 100;

        if (accountTotal > individualCap) {
            revert ExceedsIndividualCap(accountTotal, individualCap);
        }

        emit IMPACTMinted(account, category, mintAmount, reason);
        emit ReputationUpdated(account, category, _getCategoryAmount(account, category), accountTotal);
    }

    /**
     * @notice Set founder status for an account
     * @param account Address to mark as founder
     * @dev Founders have accelerated decay (10%/qtr vs 2%/qtr)
     */
    function setFounderStatus(address account, bool isFounder) external onlyMinter {
        accounts[account].isFounder = isFounder;
        emit FounderStatusSet(account, isFounder);
    }

    /*//////////////////////////////////////////////////////////////
                          DECAY & REDISTRIBUTION
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Execute quarterly decay and redistribution
     * @dev Called automatically every ~91 days
     *
     * Process:
     * 1. Decay all accounts based on their founder status
     * 2. Calculate bottom 50% of active contributors
     * 3. Redistribute 40% of decayed IMPACT to bottom 50%
     * 4. Burn remaining 60% of decayed IMPACT
     *
     * Security: Implements V2 fixes for inequality (EXTRACTIVE_RISK_REPORT.md #4)
     */
    function executeQuarterlyDecay() external onlyDecayExecutor {
        currentQuarter++;

        uint256 totalDecayed = 0;
        uint256 accountCount = accountList.length;

        // Step 1: Apply decay to all accounts
        for (uint256 i = 0; i < accountCount; i++) {
            address account = accountList[i];
            if (!accounts[account].isActive) continue;

            uint256 decayRate = accounts[account].isFounder
                ? constitution.FOUNDER_DECAY_RATE()
                : constitution.BASE_DECAY_RATE();

            uint256 accountIMPACT = getTotalIMPACT(account);
            uint256 decayAmount = (accountIMPACT * decayRate) / 100;

            // Apply decay proportionally across all categories
            _applyProportionalDecay(account, decayAmount);

            totalDecayed += decayAmount;
            accounts[account].lastDecayQuarter = currentQuarter;
        }

        // Step 2: Calculate redistribution amount (40% of decayed)
        uint256 redistributionPool = (totalDecayed * constitution.REDISTRIBUTION_PERCENTAGE()) / 100;
        uint256 burnedAmount = totalDecayed - redistributionPool;

        // Step 3: Identify bottom 50% of active contributors
        address[] memory bottom50 = _getBottom50Percent();

        // Step 4: Distribute proportionally to bottom 50%
        if (bottom50.length > 0 && redistributionPool > 0) {
            uint256 perAccountBonus = redistributionPool / bottom50.length;

            for (uint256 i = 0; i < bottom50.length; i++) {
                // Add to builder reputation (default category for redistribution)
                accounts[bottom50[i]].builderRep += perAccountBonus;
            }
        }

        // Step 5: Update total supply (subtract burned amount)
        totalSupply -= burnedAmount;

        emit DecayExecuted(currentQuarter, totalDecayed, redistributionPool);
    }

    /**
     * @notice Apply decay proportionally across all reputation categories
     * @param account Account to apply decay to
     * @param totalDecayAmount Total amount to decay
     */
    function _applyProportionalDecay(address account, uint256 totalDecayAmount) internal {
        uint256 totalIMPACT = getTotalIMPACT(account);
        if (totalIMPACT == 0) return;

        // Decay each category proportionally
        if (accounts[account].builderRep > 0) {
            uint256 builderDecay = (totalDecayAmount * accounts[account].builderRep) / totalIMPACT;
            accounts[account].builderRep -= builderDecay;
        }

        if (accounts[account].curatorRep > 0) {
            uint256 curatorDecay = (totalDecayAmount * accounts[account].curatorRep) / totalIMPACT;
            accounts[account].curatorRep -= curatorDecay;
        }

        if (accounts[account].communityRep > 0) {
            uint256 communityDecay = (totalDecayAmount * accounts[account].communityRep) / totalIMPACT;
            accounts[account].communityRep -= communityDecay;
        }
    }

    /**
     * @notice Get bottom 50% of active contributors by IMPACT holdings
     * @return Array of addresses in bottom 50%
     */
    function _getBottom50Percent() internal view returns (address[] memory) {
        // Count active accounts
        uint256 activeCount = 0;
        for (uint256 i = 0; i < accountList.length; i++) {
            if (accounts[accountList[i]].isActive && getTotalIMPACT(accountList[i]) > 0) {
                activeCount++;
            }
        }

        if (activeCount == 0) return new address[](0);

        // Create array of active accounts with their IMPACT
        address[] memory activeAccounts = new address[](activeCount);
        uint256[] memory impactAmounts = new uint256[](activeCount);
        uint256 index = 0;

        for (uint256 i = 0; i < accountList.length; i++) {
            address account = accountList[i];
            if (accounts[account].isActive && getTotalIMPACT(account) > 0) {
                activeAccounts[index] = account;
                impactAmounts[index] = getTotalIMPACT(account);
                index++;
            }
        }

        // Simple selection sort to find median (gas-intensive but correct)
        // For production, could use more efficient algorithm or off-chain sorting
        for (uint256 i = 0; i < activeCount - 1; i++) {
            for (uint256 j = i + 1; j < activeCount; j++) {
                if (impactAmounts[j] < impactAmounts[i]) {
                    // Swap
                    (impactAmounts[i], impactAmounts[j]) = (impactAmounts[j], impactAmounts[i]);
                    (activeAccounts[i], activeAccounts[j]) = (activeAccounts[j], activeAccounts[i]);
                }
            }
        }

        // Return bottom 50%
        uint256 bottom50Count = activeCount / 2;
        address[] memory bottom50 = new address[](bottom50Count);
        for (uint256 i = 0; i < bottom50Count; i++) {
            bottom50[i] = activeAccounts[i];
        }

        return bottom50;
    }

    /*//////////////////////////////////////////////////////////////
                        PARTICIPATION TRACKING
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Record that an account participated in governance voting
     * @param account Address that voted
     * @dev Called by GovernanceVoting contract
     *
     * Implements participation bonus: +5% per consecutive quarter (V2 Spec Section 3.1.A)
     */
    function recordVoteParticipation(address account) external onlyMinter {
        accounts[account].consecutiveVotingQuarters++;

        // Cap at 8 quarters (40% max bonus)
        if (accounts[account].consecutiveVotingQuarters > 8) {
            accounts[account].consecutiveVotingQuarters = 8;
        }

        emit ParticipationBonusUpdated(account, accounts[account].consecutiveVotingQuarters);
    }

    /**
     * @notice Reset participation streak for an account that didn't vote
     * @param account Address that missed voting
     */
    function resetVoteParticipation(address account) external onlyMinter {
        accounts[account].consecutiveVotingQuarters = 0;
        emit ParticipationBonusUpdated(account, 0);
    }

    /*//////////////////////////////////////////////////////////////
                        SHADOW TRADING DETECTION
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Flag an account for suspicious behavior (potential shadow trading)
     * @param account Address to flag
     * @param reason Reason for flagging
     * @dev Called by BehaviorAnalytics contract based on ML detection
     *
     * Addresses EXTRACTIVE_RISK_REPORT.md #10 (Shadow IMPACT Trading)
     */
    function flagAccount(address account, string calldata reason) external onlyMinter {
        accounts[account].isFlagged = true;
        emit ShadowTradingFlagged(account, reason);
    }

    /*//////////////////////////////////////////////////////////////
                            VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Get total IMPACT for an account (sum of all categories)
     * @param account Address to query
     * @return Total IMPACT balance
     */
    function getTotalIMPACT(address account) public view returns (uint256) {
        return accounts[account].builderRep +
               accounts[account].curatorRep +
               accounts[account].communityRep;
    }

    /**
     * @notice Calculate voting power for an account
     * @param account Address to query
     * @return Voting power (quadratic + participation bonus)
     * @dev Implements formula from V2 Spec Section 3.1.A:
     *      Voting_Power = sqrt(Total_IMPACT) * (1 + 0.05 * consecutive_quarters)
     */
    function getVotingPower(address account) public view returns (uint256) {
        uint256 totalIMPACT = getTotalIMPACT(account);
        if (totalIMPACT == 0) return 0;

        // Quadratic voting power: sqrt(IMPACT)
        uint256 basePower = _sqrt(totalIMPACT);

        // Participation bonus: 1 + (0.05 * consecutive_quarters)
        uint256 bonusMultiplier = 100 + (5 * accounts[account].consecutiveVotingQuarters);

        // Apply bonus (bonusMultiplier is in percentage points)
        uint256 votingPower = (basePower * bonusMultiplier) / 100;

        return votingPower;
    }

    /**
     * @notice Get multi-dimensional reputation breakdown for an account
     * @param account Address to query
     * @return builder Builder reputation
     * @return curator Curator reputation
     * @return community Community reputation
     * @return total Total IMPACT
     */
    function getReputationBreakdown(address account)
        external
        view
        returns (uint256 builder, uint256 curator, uint256 community, uint256 total)
    {
        return (
            accounts[account].builderRep,
            accounts[account].curatorRep,
            accounts[account].communityRep,
            getTotalIMPACT(account)
        );
    }

    /**
     * @notice Get account status and metadata
     * @param account Address to query
     * @return Account struct with all data
     */
    function getAccountInfo(address account) external view returns (Account memory) {
        return accounts[account];
    }

    /**
     * @notice Check if account is founder
     * @param account Address to query
     * @return True if founder
     */
    function isFounder(address account) external view returns (bool) {
        return accounts[account].isFounder;
    }

    /**
     * @notice Get number of active accounts
     * @return Count of active accounts
     */
    function getActiveAccountCount() external view returns (uint256) {
        uint256 count = 0;
        for (uint256 i = 0; i < accountList.length; i++) {
            if (accounts[accountList[i]].isActive && getTotalIMPACT(accountList[i]) > 0) {
                count++;
            }
        }
        return count;
    }

    /*//////////////////////////////////////////////////////////////
                          TRANSFER OVERRIDE
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Transfers are permanently disabled (soulbound token)
     * @dev Always reverts to enforce non-transferability per Constitution
     */
    function transfer(address, uint256) external pure returns (bool) {
        revert TransferNotAllowed();
    }

    function transferFrom(address, address, uint256) external pure returns (bool) {
        revert TransferNotAllowed();
    }

    function approve(address, uint256) external pure returns (bool) {
        revert TransferNotAllowed();
    }

    /*//////////////////////////////////////////////////////////////
                          HELPER FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Integer square root (Babylonian method)
     * @param x Number to find square root of
     * @return y Square root of x
     */
    function _sqrt(uint256 x) internal pure returns (uint256 y) {
        if (x == 0) return 0;
        uint256 z = (x + 1) / 2;
        y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
    }

    /**
     * @notice Get reputation amount for a specific category
     * @param account Account address
     * @param category Reputation category
     * @return Amount in that category
     */
    function _getCategoryAmount(address account, ReputationCategory category)
        internal
        view
        returns (uint256)
    {
        if (category == ReputationCategory.Builder) {
            return accounts[account].builderRep;
        } else if (category == ReputationCategory.Curator) {
            return accounts[account].curatorRep;
        } else {
            return accounts[account].communityRep;
        }
    }

    /**
     * @notice Get current quarter based on time elapsed since launch
     * @return Current quarter number
     */
    function getCurrentQuarter() external view returns (uint256) {
        return (block.timestamp - launchTimestamp) / 91 days;
    }
}
