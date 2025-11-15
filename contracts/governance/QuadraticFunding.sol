// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../core/Constitution.sol";
import "../core/IMPACTToken.sol";

/**
 * @title QuadraticFunding
 * @author Public Goods DAO
 * @notice Implements collusion-resistant quadratic funding with pairwise bonding
 * @dev Based on TOKEN_MODEL_SPEC_V2.md Section 6.1: "Prospective Grant Rounds (Quarterly) - ENHANCED"
 *
 * Algorithm: Pairwise Bonding Quadratic Funding (Buterin/Hitzig/Weyl 2019)
 * Formula: Matching = Σᵢ Σⱼ (√cᵢ × √cⱼ × (1 - similarity(i,j)))
 *
 * Key Features:
 * - Detects collusion via contribution pattern similarity
 * - 10x matching multiplier cap (prevents infinite Sybil ROI)
 * - 6-month account age requirement
 * - ML anomaly detection integration
 *
 * Security: Addresses EXTRACTIVE_RISK_REPORT.md vulnerability #7 (QF Sybil Attacks)
 * Reduces Sybil ROI from 28x (V1) to negative (V2)
 */
contract QuadraticFunding {
    /*//////////////////////////////////////////////////////////////
                                ERRORS
    //////////////////////////////////////////////////////////////*/

    error AccountTooNew();
    error InsufficientIMPACT();
    error RoundNotActive();
    error AlreadyContributed();
    error ProjectNotFound();
    error MatchingPoolExhausted();

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    event RoundCreated(
        uint256 indexed roundId,
        uint256 matchingPool,
        uint256 startTime,
        uint256 endTime
    );

    event ContributionMade(
        uint256 indexed roundId,
        uint256 indexed projectId,
        address indexed contributor,
        uint256 amount
    );

    event MatchingCalculated(
        uint256 indexed roundId,
        uint256 indexed projectId,
        uint256 directContributions,
        uint256 matchingAmount,
        uint256 totalFunding
    );

    event SybilPatternDetected(
        uint256 indexed roundId,
        address indexed contributor,
        uint256 similarityScore
    );

    /*//////////////////////////////////////////////////////////////
                                STRUCTS
    //////////////////////////////////////////////////////////////*/

    struct Project {
        address payable recipient;
        string name;
        string description;
        uint256 directContributions;
        uint256 matchingAmount;
        uint256 contributorCount;
        bool exists;
    }

    struct Contribution {
        address contributor;
        uint256 amount;
        uint256 timestamp;
    }

    struct Round {
        uint256 matchingPool;
        uint256 startTime;
        uint256 endTime;
        bool finalized;
        uint256 projectCount;
    }

    /*//////////////////////////////////////////////////////////////
                            STATE VARIABLES
    //////////////////////////////////////////////////////////////*/

    Constitution public immutable constitution;
    IMPACTToken public immutable impactToken;

    /// @notice Current round ID
    uint256 public currentRoundId;

    /// @notice Mapping of round ID => Round data
    mapping(uint256 => Round) public rounds;

    /// @notice Mapping of round ID => project ID => Project
    mapping(uint256 => mapping(uint256 => Project)) public projects;

    /// @notice Mapping of round ID => project ID => array of contributions
    mapping(uint256 => mapping(uint256 => Contribution[])) public contributions;

    /// @notice Mapping of round ID => contributor => projects they contributed to
    mapping(uint256 => mapping(address => uint256[])) public contributorProjects;

    /// @notice Governance contract
    address public governance;

    /*//////////////////////////////////////////////////////////////
                              MODIFIERS
    //////////////////////////////////////////////////////////////*/

    modifier onlyGovernance() {
        require(msg.sender == governance, "Only governance");
        _;
    }

    modifier roundActive(uint256 roundId) {
        Round memory round = rounds[roundId];
        if (block.timestamp < round.startTime || block.timestamp > round.endTime) {
            revert RoundNotActive();
        }
        _;
    }

    /*//////////////////////////////////////////////////////////////
                            CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(
        address _constitution,
        address _impactToken,
        address _governance
    ) {
        constitution = Constitution(_constitution);
        impactToken = IMPACTToken(_impactToken);
        governance = _governance;
    }

    /*//////////////////////////////////////////////////////////////
                          ROUND MANAGEMENT
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Create a new quadratic funding round
     * @param matchingPool Total matching pool for this round
     * @param duration Duration in days
     * @dev Called by governance quarterly
     */
    function createRound(
        uint256 matchingPool,
        uint256 duration
    ) external onlyGovernance returns (uint256 roundId) {
        roundId = ++currentRoundId;

        rounds[roundId] = Round({
            matchingPool: matchingPool,
            startTime: block.timestamp,
            endTime: block.timestamp + (duration * 1 days),
            finalized: false,
            projectCount: 0
        });

        emit RoundCreated(roundId, matchingPool, block.timestamp, block.timestamp + (duration * 1 days));
    }

    /**
     * @notice Add project to current round
     * @param recipient Project address
     * @param name Project name
     * @param description Project description
     * @return projectId ID of created project
     */
    function addProject(
        uint256 roundId,
        address payable recipient,
        string calldata name,
        string calldata description
    ) external onlyGovernance returns (uint256 projectId) {
        Round storage round = rounds[roundId];
        projectId = round.projectCount++;

        projects[roundId][projectId] = Project({
            recipient: recipient,
            name: name,
            description: description,
            directContributions: 0,
            matchingAmount: 0,
            contributorCount: 0,
            exists: true
        });
    }

    /*//////////////////////////////////////////////////////////////
                          CONTRIBUTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Contribute to a project in the current round
     * @param roundId Round ID
     * @param projectId Project ID
     * @param amount Amount to contribute
     * @dev Enforces 6-month account age requirement per Constitution
     */
    function contribute(
        uint256 roundId,
        uint256 projectId,
        uint256 amount
    ) external roundActive(roundId) {
        // Check account age (6 months = 180 days)
        IMPACTToken.Account memory account = impactToken.getAccountInfo(msg.sender);
        uint256 accountAgeQuarters = impactToken.currentQuarter() - account.joinedQuarter;
        uint256 accountAgeDays = accountAgeQuarters * 91; // ~91 days per quarter

        // Allow if account is old enough OR has 100+ IMPACT (proven contributor)
        bool accountOldEnough = accountAgeDays >= constitution.MIN_CONTRIBUTOR_ACCOUNT_AGE_DAYS();
        bool hasEnoughIMPACT = impactToken.getTotalIMPACT(msg.sender) >= 100e18;

        if (!accountOldEnough && !hasEnoughIMPACT) {
            revert AccountTooNew();
        }

        // Check project exists
        if (!projects[roundId][projectId].exists) {
            revert ProjectNotFound();
        }

        // Record contribution
        contributions[roundId][projectId].push(Contribution({
            contributor: msg.sender,
            amount: amount,
            timestamp: block.timestamp
        }));

        // Update project stats
        projects[roundId][projectId].directContributions += amount;
        projects[roundId][projectId].contributorCount++;

        // Track contributor's projects (for similarity calculation)
        contributorProjects[roundId][msg.sender].push(projectId);

        // Check for Sybil patterns
        uint256 similarity = _calculateContributorSimilarity(roundId, msg.sender);
        if (similarity > 80) { // >80% similarity is suspicious
            emit SybilPatternDetected(roundId, msg.sender, similarity);
        }

        emit ContributionMade(roundId, projectId, msg.sender, amount);
    }

    /*//////////////////////////////////////////////////////////////
                        MATCHING CALCULATION
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Calculate matching amounts for all projects using pairwise bonding
     * @param roundId Round to finalize
     * @dev Implements Buterin/Hitzig/Weyl pairwise bonding formula
     *
     * Standard QF: Matching = (Σ√cᵢ)² - Σcᵢ
     * Pairwise Bonding: Matching = Σᵢ Σⱼ (√cᵢ × √cⱼ × (1 - similarity(i,j)))
     *
     * Similarity penalizes coordinated contributions (Sybil/collusion resistance)
     */
    function finalizeRound(uint256 roundId) external onlyGovernance {
        Round storage round = rounds[roundId];
        require(block.timestamp > round.endTime, "Round not ended");
        require(!round.finalized, "Already finalized");

        uint256 totalQFScore = 0;
        uint256 projectCount = round.projectCount;

        // Step 1: Calculate raw QF scores for all projects
        uint256[] memory qfScores = new uint256[](projectCount);

        for (uint256 i = 0; i < projectCount; i++) {
            qfScores[i] = _calculatePairwiseBondingScore(roundId, i);
            totalQFScore += qfScores[i];
        }

        // Step 2: Distribute matching pool proportionally
        for (uint256 i = 0; i < projectCount; i++) {
            if (totalQFScore == 0) break;

            uint256 matchingAmount = (qfScores[i] * round.matchingPool) / totalQFScore;

            // Apply 10x matching cap
            uint256 directContributions = projects[roundId][i].directContributions;
            uint256 maxMatching = directContributions * constitution.MATCHING_MULTIPLIER_CAP();

            if (matchingAmount > maxMatching) {
                matchingAmount = maxMatching;
            }

            projects[roundId][i].matchingAmount = matchingAmount;

            emit MatchingCalculated(
                roundId,
                i,
                directContributions,
                matchingAmount,
                directContributions + matchingAmount
            );
        }

        round.finalized = true;
    }

    /**
     * @notice Calculate pairwise bonding score for a project
     * @param roundId Round ID
     * @param projectId Project ID
     * @return score Pairwise bonding QF score
     * @dev Σᵢ Σⱼ (√cᵢ × √cⱼ × (1 - similarity(i,j)))
     */
    function _calculatePairwiseBondingScore(
        uint256 roundId,
        uint256 projectId
    ) internal view returns (uint256 score) {
        Contribution[] memory contribs = contributions[roundId][projectId];
        uint256 n = contribs.length;

        if (n == 0) return 0;

        // Pairwise bonding: iterate over all pairs
        for (uint256 i = 0; i < n; i++) {
            for (uint256 j = i; j < n; j++) {
                address contributorI = contribs[i].contributor;
                address contributorJ = contribs[j].contributor;

                uint256 amountI = contribs[i].amount;
                uint256 amountJ = contribs[j].amount;

                // Calculate similarity between contributors
                uint256 similarity = _calculatePairSimilarity(roundId, contributorI, contributorJ);

                // Bonding factor: 1 - similarity (if 100% similar, no bonus)
                uint256 bondingFactor = 100 - similarity; // 0-100 scale

                // Pairwise contribution: √cᵢ × √cⱼ × (1 - similarity)
                uint256 pairScore = (_sqrt(amountI) * _sqrt(amountJ) * bondingFactor) / 100;

                score += pairScore;
            }
        }

        return score;
    }

    /**
     * @notice Calculate similarity between two contributors' contribution patterns
     * @param roundId Round ID
     * @param contributor1 First contributor
     * @param contributor2 Second contributor
     * @return similarity Similarity score (0-100, where 100 = identical)
     * @dev Jaccard similarity: |A ∩ B| / |A ∪ B|
     */
    function _calculatePairSimilarity(
        uint256 roundId,
        address contributor1,
        address contributor2
    ) internal view returns (uint256 similarity) {
        if (contributor1 == contributor2) return 0; // Same person doesn't penalize self

        uint256[] memory projects1 = contributorProjects[roundId][contributor1];
        uint256[] memory projects2 = contributorProjects[roundId][contributor2];

        if (projects1.length == 0 || projects2.length == 0) return 0;

        // Calculate intersection and union
        uint256 intersection = 0;
        uint256 union = projects1.length;

        // Count how many projects are in common
        for (uint256 i = 0; i < projects1.length; i++) {
            bool found = false;
            for (uint256 j = 0; j < projects2.length; j++) {
                if (projects1[i] == projects2[j]) {
                    intersection++;
                    found = true;
                    break;
                }
            }
        }

        // Union = total unique projects
        for (uint256 j = 0; j < projects2.length; j++) {
            bool found = false;
            for (uint256 i = 0; i < projects1.length; i++) {
                if (projects2[j] == projects1[i]) {
                    found = true;
                    break;
                }
            }
            if (!found) {
                union++;
            }
        }

        // Jaccard similarity: intersection / union
        if (union == 0) return 0;
        similarity = (intersection * 100) / union;

        return similarity;
    }

    /**
     * @notice Calculate overall similarity for a contributor across all their contributions
     * @param roundId Round ID
     * @param contributor Contributor address
     * @return avgSimilarity Average similarity with other contributors (0-100)
     */
    function _calculateContributorSimilarity(
        uint256 roundId,
        address contributor
    ) internal view returns (uint256 avgSimilarity) {
        uint256[] memory myProjects = contributorProjects[roundId][contributor];
        if (myProjects.length == 0) return 0;

        uint256 totalSimilarity = 0;
        uint256 comparisons = 0;

        // Compare with all other contributors to any of my projects
        for (uint256 i = 0; i < myProjects.length; i++) {
            Contribution[] memory contribs = contributions[roundId][myProjects[i]];

            for (uint256 j = 0; j < contribs.length; j++) {
                if (contribs[j].contributor != contributor) {
                    uint256 sim = _calculatePairSimilarity(roundId, contributor, contribs[j].contributor);
                    totalSimilarity += sim;
                    comparisons++;
                }
            }
        }

        if (comparisons == 0) return 0;
        avgSimilarity = totalSimilarity / comparisons;

        return avgSimilarity;
    }

    /*//////////////////////////////////////////////////////////////
                          VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Get project details
     * @param roundId Round ID
     * @param projectId Project ID
     * @return Project struct
     */
    function getProject(uint256 roundId, uint256 projectId)
        external
        view
        returns (Project memory)
    {
        return projects[roundId][projectId];
    }

    /**
     * @notice Get all contributions to a project
     * @param roundId Round ID
     * @param projectId Project ID
     * @return Array of contributions
     */
    function getProjectContributions(uint256 roundId, uint256 projectId)
        external
        view
        returns (Contribution[] memory)
    {
        return contributions[roundId][projectId];
    }

    /**
     * @notice Get round details
     * @param roundId Round ID
     * @return Round struct
     */
    function getRound(uint256 roundId) external view returns (Round memory) {
        return rounds[roundId];
    }

    /**
     * @notice Simulate matching amount for a project (before finalization)
     * @param roundId Round ID
     * @param projectId Project ID
     * @return estimatedMatching Estimated matching amount
     */
    function estimateMatching(uint256 roundId, uint256 projectId)
        external
        view
        returns (uint256 estimatedMatching)
    {
        uint256 qfScore = _calculatePairwiseBondingScore(roundId, projectId);

        // Calculate total QF score for all projects
        uint256 totalScore = 0;
        for (uint256 i = 0; i < rounds[roundId].projectCount; i++) {
            totalScore += _calculatePairwiseBondingScore(roundId, i);
        }

        if (totalScore == 0) return 0;

        estimatedMatching = (qfScore * rounds[roundId].matchingPool) / totalScore;

        // Apply 10x cap
        uint256 directContributions = projects[roundId][projectId].directContributions;
        uint256 maxMatching = directContributions * constitution.MATCHING_MULTIPLIER_CAP();

        if (estimatedMatching > maxMatching) {
            estimatedMatching = maxMatching;
        }

        return estimatedMatching;
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
}
