// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;


import {VRFCoordinatorV2Mock} from "@chainlink/contracts/src/v0.8/mocks/VRFCoordinatorV2Mock.sol";


contract VRFCoordinatorV2MockEx is VRFCoordinatorV2Mock
{

	constructor(uint96 _baseFee, uint96 _gasPriceLink) VRFCoordinatorV2Mock (_baseFee, _gasPriceLink){
	}

	function getLastSubscription() external view returns (uint64 _subId) {
		_subId = s_currentSubId;
	}
}
