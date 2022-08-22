// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import {AccessControlMixin, AccessControl} from "./AccessControlMixin.sol";
import {NativeMetaTransaction} from "./NativeMetaTransaction.sol";
import {ContextMixin} from "./ContextMixin.sol";
import {IERC165, IERC1155Receiver} from "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";
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

    error OnlySpecificErc1155CallerAllowed(address sender);
    error HatchingDisabled();
    error CantHatchThisTokenId(uint256 tokenId);
    error ArrayLengthsForBatchInconsistence();
    error TooLargeEggsBulkLimit(uint256 value);


    VRFCoordinatorV2Interface vrfCoordinator;
    uint64 subscriptionId;

    uint32 public callbackGasLimit = 2500000;
    uint16 public requestConfirmations = 3;
    bytes32 public keyHash;


    constructor(address _vrfCoordinator, address _ierc1155, address _garbage)
        VRFConsumerBaseV2(_vrfCoordinator)
        HatchingCore(_ierc1155, _garbage)
    {
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());

        vrfCoordinator = VRFCoordinatorV2Interface(_vrfCoordinator);
    }

    function setupEggsBulkLimit(uint256 value) external only(DEFAULT_ADMIN_ROLE) {

        //cannot exceed VRFCoordinatorV2.MAX_NUM_WORDS
        if (value >= 500) {
            revert TooLargeEggsBulkLimit(value);
        }
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

    function setupDistribution(
        uint256 tokenId,
        uint256[] calldata tokenIds,
        uint32[] calldata weights) external only(DEFAULT_ADMIN_ROLE) {

        return _setupDistribution(tokenId, tokenIds, weights);
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

    //ERC165 support
    function supportsInterface(bytes4 interfaceId) public view virtual override(IERC165,AccessControl) returns (bool) {
        return AccessControl.supportsInterface(interfaceId) || type(IERC1155Receiver).interfaceId == interfaceId;
    }


    function onERC1155Received(
        address /*operator*/,
        address from,
        uint256 id,
        uint256 value,
        bytes calldata /*data*/
    ) external override returns (bytes4)
    {
        if (msg.sender != address(ierc1155)) {
            revert OnlySpecificErc1155CallerAllowed(msg.sender);
        }

        if (eggsBulkLimit == 0) {
            revert HatchingDisabled();
        }

        if (!_canHatch(id)) {
            revert CantHatchThisTokenId(id);
        }

        if (value > 0) {
            uint256 requestId = reqRandomizer(value);
            _addEgg(requestId, from, id, value);
        }

        return IERC1155Receiver.onERC1155Received.selector;
    }


    function onERC1155BatchReceived(
        address /*operator*/,
        address from,
        uint256[] calldata ids,
        uint256[] calldata values,
        bytes calldata /*data*/
    ) external override returns (bytes4)
    {
        if (msg.sender != address(ierc1155)) {
            revert OnlySpecificErc1155CallerAllowed(msg.sender);
        }

        if (eggsBulkLimit == 0) {
            revert HatchingDisabled();
        }

        if (ids.length != values.length) {
            revert ArrayLengthsForBatchInconsistence();
        }



        for (uint256 i = 0; i < ids.length; i++) {
            if (!_canHatch(ids[i])) {
                revert CantHatchThisTokenId(ids[i]);
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