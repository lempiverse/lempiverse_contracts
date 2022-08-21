// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import {IERC1155} from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";


interface IERC1155Mintable is IERC1155 {
    function mint(
        address to,
        uint256 id,
        uint256 amount,
        bytes memory data
    ) external;
}



contract HatchingCore
{
	error WeightsInconsistence();

    IERC1155Mintable public ierc1155;
    address garbage;

    struct PetWeight {
		uint256[] tokenIds;
		uint32[] weights;
		uint32 total;
    }

    mapping(uint256 => PetWeight) eggsToPets;

	constructor(address _ierc1155) {
		ierc1155 = IERC1155Mintable(_ierc1155);
	}

	function _canHatch(uint256 id) internal view returns (bool) {
		PetWeight memory petWeight = eggsToPets[id];
		assert(petWeight.tokenIds.length == petWeight.weights.length);

		return petWeight.tokenIds.length > 0;
	}

	function _executeHatchingEgg(address from, uint256 id, uint256 rnd) internal {
		uint256 tokenId = _makeChoice(id, rnd);

		if (tokenId == 0) {
			ierc1155.safeTransferFrom(address(this), from, id, 1, bytes("return back"));
		} else {
			ierc1155.mint(from, tokenId, 1, bytes(""));
			ierc1155.safeTransferFrom(address(this), garbage, id, 1, bytes(""));
		}
	}

	function _makeChoice(uint256 id, uint256 rnd) internal view returns (uint256) {
		PetWeight memory petWeight = eggsToPets[id];
		assert(petWeight.tokenIds.length == petWeight.weights.length);

		if (petWeight.tokenIds.length == 0) {
			return 0;
		}

		uint32 hit = uint32(rnd % uint256(petWeight.total));
		uint32 acc = 0;
		for (uint256 i = 0; i < petWeight.weights.length; i++) {

			acc += petWeight.weights[i];

			if (hit < acc) {
				return petWeight.tokenIds[i];
			}
		}

		revert WeightsInconsistence();
	}
}