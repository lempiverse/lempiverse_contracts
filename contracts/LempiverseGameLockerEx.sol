// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import {AccessControlMixin, AccessControl} from "./AccessControlMixin.sol";
import {IERC165, IERC1155Receiver} from "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";
import {IERC1155} from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import {ERC721, ERC721Enumerable, Strings, IERC721} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";



interface IERC1155Mintable is IERC1155 {
    function mint(
        address to,
        uint256 id,
        uint256 amount,
        bytes memory data
    ) external;

    function uri(uint256 tokenId) external view returns (string memory);
}


interface OldLocker is IERC721 {
    struct Pos {
        uint256 id1155;
        uint256 timestamp;
    }

    function tokenIdsMap(uint256 tokenId) external view returns (Pos memory);
    function unlock(uint256 id721, uint256 energyUsed) external;
    function getListOfLockedPets(address owner) external view returns (uint256[] memory, uint256[] memory);
}


contract LempiverseGameLockerEx is
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
    error CantSetupAgain();


    struct Pos {
        uint128 id1155;
        uint128 flags;
        uint256 timestamp;
    }

    enum State {
        SETUPNEEDED,
        CLOSED,
        OPEN
    }

    uint256 public constant FULL_START_RANGE = 1000000;
    uint256 public constant EMPTY_START_RANGE = 2000000;
    uint256 public constant RANGE_WIDTH = 1000000;
    uint128 public constant EMPTY_FLAG = 0x1;
    uint128 public constant EXT_GID_START_RANGE = 10000;

    mapping (uint256 => Pos) public tokenIdsMap;
    uint256 public lastUid = EXT_GID_START_RANGE; //to be differ from old
    uint256 public minLockTime = 1 minutes;
    IERC1155Mintable public ierc1155;
    OldLocker public oldLocker;
    address public garbage;
    State public state = State.SETUPNEEDED;
    bytes32 public constant UNLOCKER_ROLE = keccak256("UNLOCKER_ROLE");
    string public baseURI = "";
    string public suffixURI = "";


    constructor()
        ERC721("Lempiverse locked ext Pets", "LVLEXPET")
    {
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
    }


    function setup(address _ierc1155, address _garbage, address _oldLocker) external only(DEFAULT_ADMIN_ROLE) {
        if (state != State.SETUPNEEDED) {
            revert CantSetupAgain();
        }

        ierc1155 = IERC1155Mintable(_ierc1155);
        garbage = _garbage;
        oldLocker = OldLocker(_oldLocker);
        state = State.CLOSED;
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


    function getListOfLockedPets(address owner) external view returns (uint256[] memory, uint256[] memory, bool[] memory) {
        uint256 total = balanceOf(owner);
        uint256[] memory erc721 = new uint256[](total);
        uint256[] memory erc1155 = new uint256[](total);
        bool[] memory empty = new bool[](total);

        for (uint256 i=0; i<total; i++) {
            uint256 tokenId = tokenOfOwnerByIndex(owner, i);
            erc721[i] = tokenId;
            erc1155[i] = tokenIdsMap[tokenId].id1155;
            empty[i] = (tokenIdsMap[tokenId].flags & EMPTY_FLAG) != 0x0;
        }
        return (erc721, erc1155, empty);
    }

    function getListOfLockedPetsExt(address owner) external view returns (uint256[] memory, uint256[] memory, bool[] memory) {

        (uint256[] memory erc721Old, uint256[] memory erc1155Old) = oldLocker.getListOfLockedPets(owner);

        uint256 total = balanceOf(owner);
        uint256 oldLength = erc721Old.length;

        uint256[] memory erc721 = new uint256[](total + oldLength);
        uint256[] memory erc1155 = new uint256[](total + oldLength);
        bool[] memory empty = new bool[](total + oldLength);

        for (uint256 i=0; i<oldLength; i++) {
            erc721[i] = erc721Old[i];
            erc1155[i] = erc1155Old[i];
            empty[i] = false;
        }

        for (uint256 i=0; i<total; i++) {
            uint256 tokenId = tokenOfOwnerByIndex(owner, i);
            erc721[i+oldLength] = tokenId;
            erc1155[i+oldLength] = tokenIdsMap[tokenId].id1155;
            empty[i+oldLength] = (tokenIdsMap[tokenId].flags & EMPTY_FLAG) != 0x0;
        }

        return (erc721, erc1155, empty);
    }


    function resolveNftList(address owner, uint256[] memory erc721) external view 
        returns (uint256[] memory erc1155, bool[] memory empty)
    {
        erc1155 = new uint256[](erc721.length);
        empty = new bool[](erc721.length);
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
            empty[i] = (pos.flags & EMPTY_FLAG) != 0x0;
        }
    }

    function resolveNftListExt(address owner, uint256[] memory erc721) external view
        returns (uint256[] memory erc1155, bool[] memory empty)
    {
        erc1155 = new uint256[](erc721.length);
        empty = new bool[](erc721.length);

        for (uint256 i=0; i<erc721.length; i++) {

            uint256 id = erc721[i];

            if (id < EXT_GID_START_RANGE) {
                if (oldLocker.ownerOf(id) != owner) {
                    revert NotOwnedTokenIdInList(i, id);
                }

                OldLocker.Pos memory pos = oldLocker.tokenIdsMap(id);

                if (pos.id1155 == 0) {
                    revert WrongTokenIdInList(i, id);
                }
                erc1155[i] = pos.id1155;
                empty[i] = false;

            } else {

                if (ownerOf(id) != owner) {
                    revert NotOwnedTokenIdInList(i, id);
                }

                Pos memory pos = tokenIdsMap[id];
                if (pos.id1155 == 0) {
                    revert WrongTokenIdInList(i, id);
                }
                erc1155[i] = pos.id1155;
                empty[i] = (pos.flags & EMPTY_FLAG) != 0x0;
            }
        }
    }


    function _lock(address from, uint256 id1155) internal {
        if (id1155 <= FULL_START_RANGE || id1155 > EMPTY_START_RANGE+RANGE_WIDTH) {
            revert WrongTokenIdRange(id1155);
        }

        uint128 flags = (id1155 >= EMPTY_START_RANGE) ? EMPTY_FLAG : 0x0;
        uint256 shift = (id1155 >= EMPTY_START_RANGE) ? EMPTY_START_RANGE : FULL_START_RANGE;

        uint256 id721 = ++lastUid;

        tokenIdsMap[id721] = Pos({id1155: uint128(id1155-shift), timestamp: block.timestamp, flags: flags});

        _safeMint(from, id721, abi.encodePacked(id1155));
    }

    function breedingOne(uint256 idx, uint256 id721, address owner) internal {

        bytes memory data = abi.encodePacked(id721);

        if (id721 < EXT_GID_START_RANGE) {

            if (oldLocker.ownerOf(id721) != owner) {
                revert NotOwnedTokenIdInList(idx, id721);
            }

            OldLocker.Pos memory pos = oldLocker.tokenIdsMap(id721);

            if (pos.id1155 == 0) {
                revert WrongTokenIdInList(idx, id721);
            }

            oldLocker.unlock(id721, 0);
            ierc1155.safeTransferFrom(owner, garbage, pos.id1155+FULL_START_RANGE, 1, data);

        } else {

            if (ownerOf(id721) != owner) {
                revert NotOwnedTokenIdInList(idx, id721);
            }

            Pos memory pos = tokenIdsMap[id721];
            if (pos.id1155 == 0) {
                revert WrongTokenIdInList(idx, id721);
            }

            if ((pos.flags & EMPTY_FLAG) != 0x0) {
                ierc1155.safeTransferFrom(address(this), garbage, pos.id1155+EMPTY_START_RANGE, 1, data);
            } else {
                ierc1155.safeTransferFrom(address(this), garbage, pos.id1155+FULL_START_RANGE, 1, data);
            }
        }
    }

    function breeding(uint256 id721A, uint256 id721B, address owner, uint256 tokenIdToMint) external only(UNLOCKER_ROLE) {
        breedingOne(0, id721A, owner);
        breedingOne(1, id721B, owner);

        ierc1155.mint(owner, tokenIdToMint, 1, bytes(""));
    }


    function unlock(uint256 id721, uint256 energyUsed) external only(UNLOCKER_ROLE) {

        address owner = ERC721.ownerOf(id721);

        Pos memory pos = tokenIdsMap[id721];

        if (pos.timestamp + minLockTime > block.timestamp) {
            revert NotReadyToUnlock(pos.timestamp);
        }

        bytes memory data = abi.encodePacked(id721);

        if ((pos.flags & EMPTY_FLAG) != 0x0) {
            ierc1155.safeTransferFrom(address(this), owner, pos.id1155+EMPTY_START_RANGE, 1, data);

        } else {
            if (energyUsed > 0) {
                ierc1155.safeTransferFrom(address(this), garbage, pos.id1155+FULL_START_RANGE, 1, data);
                ierc1155.mint(owner, pos.id1155+EMPTY_START_RANGE, 1, data);
            } else {
                ierc1155.safeTransferFrom(address(this), owner, pos.id1155+FULL_START_RANGE, 1, data);
            }
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
                return string(abi.encodePacked(baseURI, uint256(pos.id1155).toString(), suffixURI));
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