// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import {AccessControlMixin, AccessControl} from "./AccessControlMixin.sol";
import {IERC165, IERC1155Receiver} from "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";
import {IERC1155} from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";


interface IERC1155Mintable is IERC1155 {
    function mint(
        address to,
        uint256 id,
        uint256 amount,
        bytes memory data
    ) external;
}




contract LempiverseGameLocker is
    ERC721,
    IERC1155Receiver,
    AccessControlMixin
{

    error OnlySpecificErc1155CallerAllowed(address sender);
    error ArrayLengthsForBatchInconsistence();
    error MintingNotAllowedToThisContract();
    error NotReadyToUnlock(uint256 lockTime);
    error WrongTokenIdRange(uint256 id);

    struct Pos {
        uint256 id1155;
        uint256 timestamp;
    }

    enum State {
        CLOSED,
        OPEN
    }


    mapping (uint256 => Pos) public tokenIdsMap;
    uint256 public lastUid;
    uint256 public minLockTime = 1 days;
    IERC1155Mintable public ierc1155;
    address public garbage;
    State public state = State.CLOSED;
    bytes32 public constant UNLOCKER_ROLE = keccak256("UNLOCKER_ROLE");

    uint256 public constant FULL_START_RANGE = 1000000;
    uint256 public constant EMPTY_START_RANGE = 2000000;
    uint256 public constant RANGE_WIDTH = 1000000;

    constructor()
        ERC721("Lempiverse locked Pet", "LVLPET")
    {
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
    }

    //ERC165 support
    function supportsInterface(bytes4 interfaceId) public view virtual override(AccessControl, ERC721, IERC165) returns (bool) {
        return AccessControl.supportsInterface(interfaceId) || ERC721.supportsInterface(interfaceId);
    }


    function _lock(address from, uint256 id1155) internal {
        if (id1155 <= FULL_START_RANGE || id1155 > FULL_START_RANGE+RANGE_WIDTH) {
            revert WrongTokenIdRange(id1155);
        }

        uint256 id721 = ++lastUid;

        tokenIdsMap[id721] = Pos({id1155: id1155-FULL_START_RANGE, timestamp: block.timestamp});

        _safeMint(from, id721, abi.encodePacked(id1155));
    }


    function unlock(uint256 id721, uint256 energyUsed) external only(UNLOCKER_ROLE) {

        address owner = ERC721.ownerOf(id721);

        Pos memory pos = tokenIdsMap[id721];

        if (pos.timestamp + minLockTime > block.timestamp) {
            revert NotReadyToUnlock(pos.timestamp);
        }

        bytes memory data = abi.encodePacked(id721);
        if (energyUsed > 0) {
            ierc1155.safeTransferFrom(address(this), garbage, pos.id1155+FULL_START_RANGE, 1, data);
            ierc1155.mint(owner, pos.id1155+EMPTY_START_RANGE, 1, data);
        } else {
            ierc1155.safeTransferFrom(address(this), owner, pos.id1155+FULL_START_RANGE, 1, data);
        }
        _burn(id721);
    }


    function stopSale() external only(DEFAULT_ADMIN_ROLE) {
        state = State.CLOSED;
    }

    function startSale() external only(DEFAULT_ADMIN_ROLE) {
        state = State.OPEN;
    }

    function setMinLockTime(uint256 _minLockTime) external only(DEFAULT_ADMIN_ROLE) {
        minLockTime = _minLockTime;
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

        if (from == 0x0000000000000000000000000000000000000000) {
            revert MintingNotAllowedToThisContract();
        }


        for (uint256 i=0; i<value; i++) {
            _lock(from, id);
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

        if (ids.length != values.length) {
            revert ArrayLengthsForBatchInconsistence();
        }

        if (from == 0x0000000000000000000000000000000000000000) {
            revert MintingNotAllowedToThisContract();
        }


        for (uint256 i = 0; i < ids.length; i++) {

            uint256 value = values[i];
            if (value == 0) {
                continue;
            }

            for (uint256 j=0; j<value; j++) {
                _lock(from, ids[j]);
            }
        }

        return IERC1155Receiver.onERC1155BatchReceived.selector;
    }
}
