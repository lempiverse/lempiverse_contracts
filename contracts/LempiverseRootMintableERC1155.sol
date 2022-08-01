// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import {IERC165, ERC2981} from "@openzeppelin/contracts/token/common/ERC2981.sol";
import {ERC1155URIStorage, ERC1155} from "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155URIStorage.sol";
import {AccessControlMixin, AccessControl} from "./AccessControlMixin.sol";
import {IMintableERC1155} from "./IMintableERC1155.sol";


contract LempiverseRootMintableERC1155 is
    ERC2981,
    ERC1155URIStorage,
    AccessControlMixin,
    IMintableERC1155
{
    bytes32 public constant PREDICATE_ROLE = keccak256("PREDICATE_ROLE");

    string public name = "Lempiverse";

    mapping(uint256 => uint256) private _totalSupply;

    constructor(address mintableERC1155PredicateProxy)
        ERC1155("")
    {
        _setupContractId("LempiverseRootMintableERC1155");
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _setupRole(PREDICATE_ROLE, _msgSender());
        _setupRole(PREDICATE_ROLE, mintableERC1155PredicateProxy);
    }


    //ERC165 support
    function supportsInterface(bytes4 interfaceId) public view virtual override(IERC165, ERC2981, ERC1155, AccessControl) returns (bool) {
        return ERC1155.supportsInterface(interfaceId) ||
               ERC2981.supportsInterface(interfaceId) ||
               AccessControl.supportsInterface(interfaceId);
    }


    function mint(
        address account,
        uint256 id,
        uint256 amount,
        bytes calldata data
    ) external override only(PREDICATE_ROLE) {
        _mint(account, id, amount, data);
    }

    function mintBatch(
        address to,
        uint256[] calldata ids,
        uint256[] calldata amounts,
        bytes calldata data
    ) external override only(PREDICATE_ROLE) {
        _mintBatch(to, ids, amounts, data);
    }

    function setURI(uint256 tokenId, string memory tokenURI) external only(DEFAULT_ADMIN_ROLE) {
        _setURI(tokenId, tokenURI);
    }

    function setBaseURI(string memory baseURI) external only(DEFAULT_ADMIN_ROLE) {
        _setBaseURI(baseURI);
    }


    function setDefaultRoyalty(address receiver, uint96 feeNumerator) external only(DEFAULT_ADMIN_ROLE) {
        _setDefaultRoyalty(receiver, feeNumerator);
    }


    function deleteDefaultRoyalty() external only(DEFAULT_ADMIN_ROLE) {
        _deleteDefaultRoyalty();
    }

    function setTokenRoyalty(
        uint256 tokenId,
        address receiver,
        uint96 feeNumerator
    ) external only(DEFAULT_ADMIN_ROLE) {
        _setTokenRoyalty(tokenId, receiver, feeNumerator);
    }

    function resetTokenRoyalty(uint256 tokenId) external only(DEFAULT_ADMIN_ROLE) {
        _resetTokenRoyalty(tokenId);
    }

    /**
     * @dev Total amount of tokens in with a given id.
     */
    function totalSupply(uint256 id) public view virtual returns (uint256) {
        return _totalSupply[id];
    }

    /**
     * @dev Indicates whether any token exist with a given id, or not.
     */
    function exists(uint256 id) public view virtual returns (bool) {
        return totalSupply(id) > 0;
    }

    /**
     * @dev See {ERC1155-_beforeTokenTransfer}.
     */
    function _beforeTokenTransfer(
        address operator,
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) internal virtual override {
        super._beforeTokenTransfer(operator, from, to, ids, amounts, data);

        if (from == address(0)) {
            for (uint256 i = 0; i < ids.length; ++i) {
                _totalSupply[ids[i]] += amounts[i];
            }
        }

        if (to == address(0)) {
            for (uint256 i = 0; i < ids.length; ++i) {
                uint256 id = ids[i];
                uint256 amount = amounts[i];
                uint256 supply = _totalSupply[id];
                require(supply >= amount, "ERC1155: burn amount exceeds totalSupply");
                unchecked {
                    _totalSupply[id] = supply - amount;
                }
            }
        }
    }
}
