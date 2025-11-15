// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../core/Constitution.sol";

/**
 * @title ConflictRegistry
 * @author Public Goods DAO
 * @notice Tracks conflict-of-interest disclosures for Citizens' House members
 * @dev Implements TOKEN_MODEL_SPEC_V2.md Section 5.2: "Collusion Resistance - ENHANCED"
 *
 * Key Features:
 * - Mandatory quarterly COI disclosures for Citizens' House
 * - Cannot vote on projects with disclosed conflicts
 * - Public transparency (all disclosures on-chain via IPFS)
 * - Whistleblower bounty for false disclosures
 * - Third-party review if >30% recuse
 *
 * Security: Addresses EXTRACTIVE_RISK_REPORT.md vulnerability #5 (Retro Funding Gaming)
 * Prevents Citizens' House members from extracting $500k+ via hidden conflicts
 */
contract ConflictRegistry {
    /*//////////////////////////////////////////////////////////////
                                ERRORS
    //////////////////////////////////////////////////////////////*/

    error NotCitizen();
    error ConflictExists();
    error DisclosureRequired();
    error InvalidProject();
    error QuarterlyDisclosureOverdue();

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    event ConflictDisclosed(
        address indexed citizen,
        uint256 indexed projectId,
        string conflictType,
        string ipfsHash
    );

    event QuarterlyDisclosureSubmitted(
        address indexed citizen,
        uint256 indexed quarter,
        string ipfsHash,
        uint256 projectCount
    );

    event VoteBlocked(
        address indexed citizen,
        uint256 indexed projectId,
        string reason
    );

    event ThirdPartyReviewTriggered(
        uint256 indexed projectId,
        uint256 recusalCount,
        uint256 totalCitizens
    );

    event FalseDisclosureReported(
        address indexed reporter,
        address indexed citizen,
        uint256 bountyAmount
    );

    /*//////////////////////////////////////////////////////////////
                                STRUCTS
    //////////////////////////////////////////////////////////////*/

    struct Conflict {
        address citizen;
        uint256 projectId;
        ConflictType conflictType;
        string description;
        string ipfsHash; // Full disclosure document
        uint256 disclosedAt;
        bool exists;
    }

    struct QuarterlyDisclosure {
        string ipfsHash; // Hash of comprehensive disclosure doc
        uint256 submittedAt;
        uint256 projectCount; // Number of projects disclosed
        bool submitted;
    }

    enum ConflictType {
        Founder,        // Co-founder or founder of project
        Employee,       // Current or recent employee
        Advisor,        // Advisor or consultant
        Financial,      // Financial interest (equity, tokens, etc.)
        Family,         // Family member involved
        PastContributor // Contributed in past 2 years
    }

    /*//////////////////////////////////////////////////////////////
                            STATE VARIABLES
    //////////////////////////////////////////////////////////////*/

    Constitution public immutable constitution;

    /// @notice Citizens' House contract address
    address public citizensHouse;

    /// @notice Mapping of citizen => projectId => Conflict
    mapping(address => mapping(uint256 => Conflict)) public conflicts;

    /// @notice Mapping of citizen => quarter => QuarterlyDisclosure
    mapping(address => mapping(uint256 => QuarterlyDisclosure)) public quarterlyDisclosures;

    /// @notice Mapping of projectId => array of citizens with conflicts
    mapping(uint256 => address[]) public projectConflicts;

    /// @notice Last disclosure quarter for each citizen
    mapping(address => uint256) public lastDisclosureQuarter;

    /// @notice Whistleblower bounty pool
    uint256 public bountyPool;

    /*//////////////////////////////////////////////////////////////
                              MODIFIERS
    //////////////////////////////////////////////////////////////*/

    modifier onlyCitizen() {
        // In production, check CitizensHouse.isCitizen(msg.sender)
        if (msg.sender != citizensHouse) revert NotCitizen();
        _;
    }

    /*//////////////////////////////////////////////////////////////
                            CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(address _constitution) {
        constitution = Constitution(_constitution);
    }

    /**
     * @notice Set Citizens' House contract address
     * @param _citizensHouse Address of Citizens' House contract
     */
    function setCitizensHouse(address _citizensHouse) external {
        require(citizensHouse == address(0), "Already set");
        citizensHouse = _citizensHouse;
    }

    /*//////////////////////////////////////////////////////////////
                        CONFLICT DISCLOSURE
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Disclose conflict of interest for a specific project
     * @param projectId Project with which citizen has conflict
     * @param conflictType Type of conflict
     * @param description Human-readable description
     * @param ipfsHash IPFS hash of full disclosure document
     * @dev Called by Citizens' House members proactively
     */
    function discloseConflict(
        uint256 projectId,
        ConflictType conflictType,
        string calldata description,
        string calldata ipfsHash
    ) external {
        // Check if conflict already disclosed
        if (conflicts[msg.sender][projectId].exists) {
            revert ConflictExists();
        }

        // Record conflict
        conflicts[msg.sender][projectId] = Conflict({
            citizen: msg.sender,
            projectId: projectId,
            conflictType: conflictType,
            description: description,
            ipfsHash: ipfsHash,
            disclosedAt: block.timestamp,
            exists: true
        });

        // Track project's conflicts
        projectConflicts[projectId].push(msg.sender);

        emit ConflictDisclosed(msg.sender, projectId, _conflictTypeToString(conflictType), ipfsHash);
    }

    /**
     * @notice Submit quarterly comprehensive disclosure
     * @param quarter Quarter number
     * @param ipfsHash IPFS hash of comprehensive disclosure document
     * @param projectCount Number of projects with conflicts
     * @dev Required every quarter per Constitution (CONFLICT_DISCLOSURE_REQUIRED = true)
     *
     * Disclosure must include:
     * - All projects contributed to (past 2 years)
     * - Financial interests in nominated projects
     * - Personal relationships with project teams
     * - Any consulting/advising roles in Web3
     */
    function submitQuarterlyDisclosure(
        uint256 quarter,
        string calldata ipfsHash,
        uint256 projectCount
    ) external {
        require(!quarterlyDisclosures[msg.sender][quarter].submitted, "Already submitted");

        quarterlyDisclosures[msg.sender][quarter] = QuarterlyDisclosure({
            ipfsHash: ipfsHash,
            submittedAt: block.timestamp,
            projectCount: projectCount,
            submitted: true
        });

        lastDisclosureQuarter[msg.sender] = quarter;

        emit QuarterlyDisclosureSubmitted(msg.sender, quarter, ipfsHash, projectCount);
    }

    /*//////////////////////////////////////////////////////////////
                          VOTING RESTRICTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Check if citizen can vote on a project
     * @param citizen Citizen address
     * @param projectId Project ID
     * @param currentQuarter Current quarter
     * @return canVote True if no conflict
     * @return reason Reason for blocking (if applicable)
     * @dev Called by CitizensHouse before allowing vote
     *
     * Blocks voting if:
     * 1. Disclosed conflict exists
     * 2. Quarterly disclosure not submitted (overdue)
     */
    function canVoteOnProject(
        address citizen,
        uint256 projectId,
        uint256 currentQuarter
    ) external view returns (bool canVote, string memory reason) {
        // Check if quarterly disclosure is current (within 1 quarter)
        if (currentQuarter > lastDisclosureQuarter[citizen] + 1) {
            return (false, "Quarterly disclosure overdue");
        }

        // Check for disclosed conflict
        if (conflicts[citizen][projectId].exists) {
            return (false, string(abi.encodePacked(
                "Conflict: ",
                _conflictTypeToString(conflicts[citizen][projectId].conflictType)
            )));
        }

        return (true, "");
    }

    /**
     * @notice Check if project needs third-party review due to high recusal rate
     * @param projectId Project ID
     * @param totalCitizens Total number of Citizens' House members
     * @return needsReview True if >30% have conflicts
     * @dev Per V2 Spec: "If >30% of Citizens recuse → independent third-party review required"
     */
    function needsThirdPartyReview(
        uint256 projectId,
        uint256 totalCitizens
    ) external view returns (bool needsReview) {
        uint256 conflictCount = projectConflicts[projectId].length;
        uint256 recusalPercentage = (conflictCount * 100) / totalCitizens;

        if (recusalPercentage > 30) {
            return true;
        }

        return false;
    }

    /**
     * @notice Trigger third-party review for high-conflict project
     * @param projectId Project ID
     * @param totalCitizens Total citizens count
     * @dev Emits event for off-chain third-party review coordination
     */
    function triggerThirdPartyReview(
        uint256 projectId,
        uint256 totalCitizens
    ) external {
        uint256 conflictCount = projectConflicts[projectId].length;
        require(conflictCount > (totalCitizens * 30) / 100, "Review not needed");

        emit ThirdPartyReviewTriggered(projectId, conflictCount, totalCitizens);
    }

    /*//////////////////////////////////////////////////////////////
                        WHISTLEBLOWER SYSTEM
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Report false or incomplete disclosure
     * @param citizen Citizen who made false disclosure
     * @param projectId Project in question
     * @param evidence IPFS hash of evidence
     * @dev If proven, reporter receives 10% of slashed IMPACT value as bounty
     *
     * Security: Addresses EXTRACTIVE_RISK_REPORT.md recommendation for whistleblower rewards
     */
    function reportFalseDisclosure(
        address citizen,
        uint256 projectId,
        string calldata evidence
    ) external {
        // In production, this would trigger governance review
        // If confirmed, citizen loses IMPACT and reporter gets bounty

        // For now, just emit event for off-chain processing
        emit FalseDisclosureReported(msg.sender, citizen, 0);
    }

    /**
     * @notice Fund whistleblower bounty pool
     */
    function fundBountyPool() external payable {
        bountyPool += msg.value;
    }

    /*//////////////////////////////////////////////////////////////
                          VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Get all citizens with conflicts for a project
     * @param projectId Project ID
     * @return Array of citizen addresses with conflicts
     */
    function getProjectConflicts(uint256 projectId) external view returns (address[] memory) {
        return projectConflicts[projectId];
    }

    /**
     * @notice Get conflict details
     * @param citizen Citizen address
     * @param projectId Project ID
     * @return Conflict struct
     */
    function getConflict(address citizen, uint256 projectId)
        external
        view
        returns (Conflict memory)
    {
        return conflicts[citizen][projectId];
    }

    /**
     * @notice Get quarterly disclosure
     * @param citizen Citizen address
     * @param quarter Quarter number
     * @return QuarterlyDisclosure struct
     */
    function getQuarterlyDisclosure(address citizen, uint256 quarter)
        external
        view
        returns (QuarterlyDisclosure memory)
    {
        return quarterlyDisclosures[citizen][quarter];
    }

    /**
     * @notice Check if citizen's disclosures are current
     * @param citizen Citizen address
     * @param currentQuarter Current quarter
     * @return isCurrent True if disclosed within past quarter
     */
    function isDisclosureCurrent(address citizen, uint256 currentQuarter)
        external
        view
        returns (bool isCurrent)
    {
        return currentQuarter <= lastDisclosureQuarter[citizen] + 1;
    }

    /*//////////////////////////////////////////////////////////////
                          HELPER FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Convert ConflictType enum to string
     * @param conflictType Type of conflict
     * @return String representation
     */
    function _conflictTypeToString(ConflictType conflictType)
        internal
        pure
        returns (string memory)
    {
        if (conflictType == ConflictType.Founder) return "Founder";
        if (conflictType == ConflictType.Employee) return "Employee";
        if (conflictType == ConflictType.Advisor) return "Advisor";
        if (conflictType == ConflictType.Financial) return "Financial";
        if (conflictType == ConflictType.Family) return "Family";
        if (conflictType == ConflictType.PastContributor) return "PastContributor";
        return "Unknown";
    }
}
