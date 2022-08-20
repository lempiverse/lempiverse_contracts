// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import {AccessControlMixin, AccessControl} from "./AccessControlMixin.sol";
import {NativeMetaTransaction} from "./NativeMetaTransaction.sol";
import {ContextMixin} from "./ContextMixin.sol";
import {SafeERC20, IERC20Permit} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC1155Receiver} from "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";
import {FlatEggsArray} from "./FlatEggsArray.sol";



contract LempiverseHatching is
	FlatEggsArray,
    AccessControlMixin,
    NativeMetaTransaction,
    ContextMixin,
    IERC1155Receiver
{
    using SafeERC20 for IERC20;


    constructor() {
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
    }

    function _hatchEgg(address from, uint256 id, uint256 rnd) internal override {
    	//TODO
    }


    function reqRandomizer() internal {
	    //TODO call randomizer
	    eggsCounter = 0;
    }


    function onERC1155Received(
        address /*operator*/,
        address from,
        uint256 id,
        uint256 value,
        bytes calldata /*data*/
    ) external override returns (bytes4)
    {
    	_addEgg(from, id, value);

    	if (eggsCounter > eggsBulkLimit) {
    		reqRandomizer();
    	}

    	return IERC1155Receiver.onERC1155BatchReceived.selector;
    }


    function onERC1155BatchReceived(
        address /*operator*/,
        address from,
        uint256[] calldata ids,
        uint256[] calldata values,
        bytes calldata /*data*/
    ) external override returns (bytes4)
    {
    	require(ids.length == values.length, "length inconsistence");


    	for (uint256 i = 0; i < ids.length; i++) {
    		_addEgg(from, ids[i], values[i]);
    	}

    	if (eggsCounter > eggsBulkLimit) {
    		reqRandomizer();
    	}

    	return IERC1155Receiver.onERC1155BatchReceived.selector;
    }

}