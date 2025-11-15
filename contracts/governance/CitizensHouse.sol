// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../core/Constitution.sol";
import "./ConflictRegistry.sol";

/**
 * @title CitizensHouse
 * @author Public Goods DAO
 * @notice Elected representatives for retroactive funding and oversight
 * @dev Implements V2 Spec Section 3.1.B: "Citizens' House (Elected Experts) - REFORMED"
 *
 * Key Features:
 * - 1-person-1-vote elections (NOT IMPACT-weighted)
 * - 50-100 members serving 6-month terms
 * - Max 2 founders allowed (anti-nepotism)
 * - Max 2 consecutive terms
 * - Veto power on constitutional violations
 * - Retroactive funding allocation
 *
 * NOTE: Simplified stub showing core architecture
 */
contract CitizensHouse {
    Constitution public immutable constitution;
    ConflictRegistry public immutable conflictRegistry;

    struct Citizen {
        address account;
        uint256 electedAt;
        uint256 termCount;
        bool isFounder;
        bool isActive;
    }

    mapping(address => Citizen) public citizens;
    address[] public citizenList;
    uint256 public founderCount;

    constructor(address _constitution, address _conflictRegistry) {
        constitution = Constitution(_constitution);
        conflictRegistry = ConflictRegistry(_conflictRegistry);
    }

    /**
     * @notice Vote on retroactive funding allocation
     * @param projectId Project to fund
     * @param amount Funding amount
     */
    function voteRetroactiveFunding(uint256 projectId, uint256 amount) external {
        require(citizens[msg.sender].isActive, "Not a citizen");

        // Check conflict of interest
        (bool canVote, string memory reason) = conflictRegistry.canVoteOnProject(
            msg.sender,
            projectId,
            block.timestamp / 91 days // Current quarter
        );
        require(canVote, reason);

        // Vote logic would be implemented here
    }

    // Additional functions: elect, veto, allocateRetrospective, etc.
}
