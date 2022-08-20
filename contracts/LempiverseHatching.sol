// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import {AccessControlMixin, AccessControl} from "./AccessControlMixin.sol";
import {NativeMetaTransaction} from "./NativeMetaTransaction.sol";
import {ContextMixin} from "./ContextMixin.sol";
import {SafeERC20, IERC20Permit} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC1155Receiver} from "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";
import {FlatEggsArray} from "./FlatEggsArray.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import {VRFConsumerBaseV2} from "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";




contract LempiverseHatching is
    VRFConsumerBaseV2,
    FlatEggsArray,
    AccessControlMixin,
    NativeMetaTransaction,
    ContextMixin,
    IERC1155Receiver
{
    using SafeERC20 for IERC20;


    VRFCoordinatorV2Interface vrfCoordinator;
    uint64 subscriptionId;
    address public ierc1155;

    uint32 public callbackGasLimit = 2500000;
    uint16 public requestConfirmations = 3;
    bytes32 public keyHash;

    uint256 public lastRequestId;


    constructor(address _vrfCoordinator, address _ierc1155) VRFConsumerBaseV2(_vrfCoordinator) {
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());

        vrfCoordinator = VRFCoordinatorV2Interface(_vrfCoordinator);
        ierc1155 = _ierc1155;
    }

    function setupEggsBulkLimit(uint256 value) external only(DEFAULT_ADMIN_ROLE) {

        //cannot exceed VRFCoordinatorV2.MAX_NUM_WORDS
        require(value < 200, "too large eggsBulkLimit");
        eggsBulkLimit = value;
    }

    function setupVRF(
                uint32 _callbackGasLimit,
                uint16 _requestConfirmations,
                bytes32 _keyHash,
                uint64 _subscriptionId) external only(DEFAULT_ADMIN_ROLE) {

        callbackGasLimit = _callbackGasLimit;
        requestConfirmations = _requestConfirmations;
        keyHash = _keyHash;
        subscriptionId = _subscriptionId;
    }


    function _hatchEgg(address from, uint256 id, uint256 rnd) internal override {
        //TODO
    }

    function fulfillRandomWords(uint256, uint256[] memory randomWords) internal override {
        _startHatch(randomWords);
    }

    function reqRandomizer() internal {
        lastRequestId = vrfCoordinator.requestRandomWords(
          keyHash,
          subscriptionId,
          requestConfirmations,
          callbackGasLimit,
          uint32(eggsCounter)
        );
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
        require(msg.sender == ierc1155, "only specific ierc1155 caller allowed");
        require(eggsBulkLimit > 0, "hatching disabled");

        _addEgg(from, id, value);

        if (eggsCounter >= eggsBulkLimit) {
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
        require(msg.sender == ierc1155, "only specific ierc1155 caller allowed");
        require(eggsBulkLimit > 0, "hatching disabled");

        require(ids.length == values.length, "length inconsistence");


        for (uint256 i = 0; i < ids.length; i++) {
            _addEgg(from, ids[i], values[i]);
        }

        if (eggsCounter >= eggsBulkLimit) {
            reqRandomizer();
        }

        return IERC1155Receiver.onERC1155BatchReceived.selector;
    }

}