// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import {HatchingDistribution} from "./HatchingDistribution.sol";


contract HatchingDistributionTest is HatchingDistribution
{
	function makeChoice(uint256 id, uint256 rnd) external view returns (uint256) {
		return _makeChoice(id, rnd);
	}

    function canHatch(uint256 id) external view returns (bool) {
        return _canHatch(id);
    }

    function setupDistribution(
        uint256 tokenId,
        uint256[] calldata tokenIds,
        uint32[] calldata weights) external {

        return _setupDistribution(tokenId, tokenIds, weights);
    }
}

