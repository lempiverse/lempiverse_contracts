// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import {AccessControlMixin, AccessControl} from "./AccessControlMixin.sol";
import {NativeMetaTransaction} from "./NativeMetaTransaction.sol";
import {ContextMixin} from "./ContextMixin.sol";
import {IERC1155Receiver} from "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";
import {FlatEggsArray} from "./FlatEggsArray.sol";
import {HatchingCore} from "./HatchingCore.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import {VRFConsumerBaseV2} from "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";




contract LempiverseHatching is
    HatchingCore,
    VRFConsumerBaseV2,
    FlatEggsArray,
    AccessControlMixin,
    NativeMetaTransaction,
    ContextMixin,
    IERC1155Receiver
{

    VRFCoordinatorV2Interface vrfCoordinator;
    uint64 subscriptionId;

    uint32 public callbackGasLimit = 2500000;
    uint16 public requestConfirmations = 3;
    bytes32 public keyHash;


    constructor(address _vrfCoordinator, address _ierc1155)
        VRFConsumerBaseV2(_vrfCoordinator)
        HatchingCore(_ierc1155)
    {
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());

        vrfCoordinator = VRFCoordinatorV2Interface(_vrfCoordinator);
    }

    function setupEggsBulkLimit(uint256 value) external only(DEFAULT_ADMIN_ROLE) {

        //cannot exceed VRFCoordinatorV2.MAX_NUM_WORDS
        require(value < 500, "too large eggsBulkLimit");
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

    function canHatch(uint256 id) external view returns (bool) {
        return _canHatch(id);
    }


    function _hatchEgg(address from, uint256 id, uint256 rnd) internal override {
        _executeHatchingEgg(from, id, rnd);
    }

    function fulfillRandomWords(uint256 reqId, uint256[] memory randomWords) internal override {
        _startHatch(reqId, randomWords);
    }

    function reqRandomizer(uint256 numWorlds) internal returns (uint256 requestId) {
        requestId = vrfCoordinator.requestRandomWords(
          keyHash,
          subscriptionId,
          requestConfirmations,
          callbackGasLimit,
          uint32(numWorlds)
        );
    }


    function onERC1155Received(
        address /*operator*/,
        address from,
        uint256 id,
        uint256 value,
        bytes calldata /*data*/
    ) external override returns (bytes4)
    {
        require(msg.sender == address(ierc1155), "only specific ierc1155 caller allowed");
        require(eggsBulkLimit > 0, "hatching disabled");

        if (!_canHatch(id)) {
            return 0xbad00bad;
        }

        if (value > 0) {
            uint256 requestId = reqRandomizer(value);
            _addEgg(requestId, from, id, value);
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
        require(msg.sender == address(ierc1155), "only specific ierc1155 caller allowed");
        require(eggsBulkLimit > 0, "hatching disabled");

        require(ids.length == values.length, "length inconsistence");


        for (uint256 i = 0; i < ids.length; i++) {
            if (!_canHatch(ids[i])) {
                return 0xbad00bad;
            }

            if (values[i] == 0) {
                continue;
            }

            uint256 requestId = reqRandomizer(values[i]);
            _addEgg(requestId, from, ids[i], values[i]);
        }

        return IERC1155Receiver.onERC1155BatchReceived.selector;
    }

}