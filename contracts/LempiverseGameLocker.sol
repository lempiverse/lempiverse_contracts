// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import {AccessControlMixin, AccessControl} from "./AccessControlMixin.sol";
import {IERC165, IERC1155Receiver} from "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";
import {IERC1155} from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import {ERC721, ERC721Enumerable, Strings} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";



interface IERC1155Mintable is IERC1155 {
    function mint(
        address to,
        uint256 id,
        uint256 amount,
        bytes memory data
    ) external;

    function uri(uint256 tokenId) external view returns (string memory);
}




contract LempiverseGameLocker is
    ERC721Enumerable,
    IERC1155Receiver,
    AccessControlMixin
{
    using Strings for uint256;
    
    error OnlySpecificErc1155CallerAllowed(address sender);
    error ArrayLengthsForBatchInconsistence();
    error MintingNotAllowedToThisContract();
    error NotReadyToUnlock(uint256 lockTime);
    error WrongTokenIdRange(uint256 id);
    error WrongTokenIdInList(uint256 idx, uint256 id);
    error NotOwnedTokenIdInList(uint256 idx, uint256 id);
    error TransferNotAllowed();
    error IsClosed();


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
    uint256 public minLockTime = 1 minutes;
    IERC1155Mintable public ierc1155;
    address public garbage;
    State public state = State.CLOSED;
    bytes32 public constant UNLOCKER_ROLE = keccak256("UNLOCKER_ROLE");
    string public baseURI = "";
    string public suffixURI = "";

    uint256 public constant FULL_START_RANGE = 1000000;
    uint256 public constant EMPTY_START_RANGE = 2000000;
    uint256 public constant RANGE_WIDTH = 1000000;

    constructor()
        ERC721("Lempiverse locked Pets", "LVLPET")
    {
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
    }


    function setup(address _ierc1155, address _garbage) external only(DEFAULT_ADMIN_ROLE) {
        ierc1155 = IERC1155Mintable(_ierc1155);
        garbage = _garbage;
    }


    //ERC165 support
    function supportsInterface(bytes4 interfaceId) public view virtual override(AccessControl, IERC165, ERC721Enumerable) returns (bool) {
        return AccessControl.supportsInterface(interfaceId) || ERC721Enumerable.supportsInterface(interfaceId);
    }


    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal virtual override(ERC721Enumerable) {
        super._beforeTokenTransfer(from, to, tokenId);
    }


    function getListOfLockedPets(address owner) external view returns (uint256[] memory, uint256[] memory){
        uint256 total = balanceOf(owner);
        uint256[] memory erc721 = new uint256[](total);
        uint256[] memory erc1155 = new uint256[](total);
        for (uint256 i=0; i<total; i++) {
            uint256 tokenId = tokenOfOwnerByIndex(owner, i);
            erc721[i] = tokenId;
            erc1155[i] = tokenIdsMap[tokenId].id1155;
        }
        return (erc721, erc1155);
    }

    function resolveNftList(address owner, uint256[] memory erc721) external view 
        returns (uint256[] memory erc1155)
    {
        erc1155 = new uint256[](erc721.length);
        for (uint256 i=0; i<erc721.length; i++) {
            uint256 id = erc721[i];
            if (ownerOf(id) != owner) {
                revert NotOwnedTokenIdInList(i, id);
            }

            Pos memory pos = tokenIdsMap[id];
            if (pos.id1155 == 0) {
                revert WrongTokenIdInList(i, id);
            }
            erc1155[i] = pos.id1155;
        }
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


    function stop() external only(DEFAULT_ADMIN_ROLE) {
        state = State.CLOSED;
    }

    function start() external only(DEFAULT_ADMIN_ROLE) {
        state = State.OPEN;
    }

    function setMinLockTime(uint256 _minLockTime) external only(DEFAULT_ADMIN_ROLE) {
        minLockTime = _minLockTime;
    }

    function setURI(string calldata uri, string calldata suffix) external only(DEFAULT_ADMIN_ROLE) {
        baseURI = uri;
        suffixURI = suffix;
    }

    function tokenURI(uint256 id721) public view virtual override returns (string memory) {
        _requireMinted(id721);


        if (bytes(baseURI).length > 0) {
            if (bytes(suffixURI).length > 0) {
                Pos memory pos = tokenIdsMap[id721];
                return string(abi.encodePacked(baseURI, pos.id1155.toString(), suffixURI));
            } else {
                return baseURI;
            }
        } else {
            return "";
        }
    }


    function transferFrom(
        address,
        address,
        uint256
    ) public virtual override {
        revert TransferNotAllowed();
    }

    /**
     * @dev See {IERC721-safeTransferFrom}.
     */
    function safeTransferFrom(
        address,
        address,
        uint256,
        bytes memory
    ) public virtual override {
        revert TransferNotAllowed();
    }

    function onERC1155Received(
        address /*operator*/,
        address from,
        uint256 id,
        uint256 value,
        bytes calldata /*data*/
    ) external override returns (bytes4)
    {
        if (state != State.OPEN) {
            revert IsClosed();
        }

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
        if (state != State.OPEN) {
            revert IsClosed();
        }

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
            for (uint256 j=0; j<value; j++) {
                _lock(from, ids[i]);
            }
        }

        return IERC1155Receiver.onERC1155BatchReceived.selector;
    }
}