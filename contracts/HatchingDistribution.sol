// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;



contract HatchingDistribution
{
	error WeightsInconsistence();
	error TokenIdsWeightsLengthInconsistence(uint256 tokenIdsLen, uint256 weightsLen);
	error TooLargeWeight(uint256 idx, uint256 weight);
	error TooLargeTotalWeight(uint256 idx);

    uint32 public constant MAX_WEIGHT = 1000000;
    uint32 public constant MAX_POSITIONS = 256;

    struct PetWeight {
		uint256[] tokenIds;
		uint32[] weights;
		uint32 total;
    }

    mapping(uint256 => PetWeight) eggsToPets;

	function _setupDistribution(
		uint256 tokenId,
		uint256[] calldata tokenIds,
		uint32[] calldata weights) internal {

		if (tokenIds.length > MAX_POSITIONS || tokenIds.length != weights.length) {
			revert TokenIdsWeightsLengthInconsistence(tokenIds.length, weights.length);
		}

		uint256 total = 0;

		for (uint256 i = 0; i < tokenIds.length; i++) {
			if (weights[i] > MAX_WEIGHT) {
				revert TooLargeWeight(i, weights[i]);
			}

			total += weights[i];

			if (total >= type(uint32).max) {
				revert TooLargeTotalWeight(i);
			}
		}

		eggsToPets[tokenId] = PetWeight(tokenIds, weights, uint32(total));
	}

	function getDistribution(uint256 tokenId) external view returns (PetWeight memory) {
		return eggsToPets[tokenId];
	}


	function _canHatch(uint256 id) internal view returns (bool) {
		PetWeight memory petWeight = eggsToPets[id];
		assert(petWeight.tokenIds.length == petWeight.weights.length);

		return petWeight.tokenIds.length > 0;
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

