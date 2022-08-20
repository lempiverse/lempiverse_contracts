// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import {AccessControlMixin, AccessControl} from "./AccessControlMixin.sol";
import {NativeMetaTransaction} from "./NativeMetaTransaction.sol";
import {ContextMixin} from "./ContextMixin.sol";
import {SafeERC20, IERC20Permit} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC1155Receiver} from "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";



abstract contract FlatEggsArray
{
    struct Egg {
    	address from;
        uint256 id;
        uint256 value;
    }

    Egg [] public toHatchList;
    uint256 public eggsCounter;
    uint256 public eggsBulkLimit;

    uint256 public addIndex;
    uint256 public hatchIndex;
    uint256 public topIndex;

    constructor() {
        eggsBulkLimit = 128;
    }

    function _hatchEgg(address from, uint256 id, uint256 rnd) internal virtual;

    function _startHatch(uint256[] memory rnds) internal {

		uint256 rndIdx = 0;
		uint256 i;
    	for (i = hatchIndex; i < topIndex; i++) {

	    	Egg memory egg = toHatchList[i];

	    	if (egg.value > rnds.length - rndIdx) {
	    		break;
			}

	    	for (uint256 j = 0; j < egg.value; j++) {
	    		_hatchEgg(egg.from, egg.id, rnds[ rndIdx++ ]);
	    	}
	    }

	    if (addIndex > i && i > eggsBulkLimit) {
	    	//if there are enought space at begins of array and
	    	//currently we are adding from end of array
	    	//so let's start adding at begins of array
	    	addIndex = 0;
	    }

	    if (i == topIndex) {

	    	hatchIndex = 0;
	    	topIndex = 0;

	    } else {
	    	hatchIndex = i;
	    }

    }

    function _addEgg(
        address from,
        uint256 id,
        uint256 value) internal {

    	require(value < eggsBulkLimit/2, "too big value to transfer");

    	if (addIndex >= toHatchList.length) {
    		toHatchList.push(Egg(from, id, value));
    		addIndex++;
    	} else {
    		toHatchList[addIndex++] = Egg(from, id, value);
    	}

    	if (addIndex > hatchIndex) {
    		topIndex = addIndex;
    	}

    	eggsCounter += value;
    }

}

contract FlatEggsArrayTest is FlatEggsArray
{
    function _hatchEgg(address from, uint256 id, uint256 rnd) internal override {
    	//TODO
    }


    function testStartHatch(uint256[] memory rnds) external {
    	_startHatch(rnds);
    }


    function testResetEggsCounter() external {
	    eggsCounter = 0;
    }


    function testAddEggs(
        address from,
        uint256 id,
        uint256 value,
        bytes calldata /*data*/
    ) external
    {
    	_addEgg(from, id, value);
    }
}


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