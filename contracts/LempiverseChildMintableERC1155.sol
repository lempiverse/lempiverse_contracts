// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import {ERC2981} from "@openzeppelin/contracts/token/common/ERC2981.sol";
import {ERC1155URIStorage, ERC1155} from "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155URIStorage.sol";
import {AccessControlMixin, AccessControl} from "./AccessControlMixin.sol";
import {IChildToken} from "./IChildToken.sol";
import {NativeMetaTransaction} from "./NativeMetaTransaction.sol";
import {ContextMixin} from "./ContextMixin.sol";


contract LempiverseChildMintableERC1155 is
    ERC2981,
    ERC1155URIStorage,
    IChildToken,
    AccessControlMixin,
    NativeMetaTransaction,
    ContextMixin
{
    bytes32 public constant DEPOSITOR_ROLE = keccak256("DEPOSITOR_ROLE");

    string public name = "Lempiverse";

    address public metaTransactionOperator;

    mapping(uint256 => uint256) private _totalSupply;

    constructor(address childChainManager)
        ERC1155("")
    {
        _setupContractId("LempiverseChildMintableERC1155");
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _setupRole(DEPOSITOR_ROLE, childChainManager);
        _initializeEIP712("Lempiverse");
    }

    // This is to support Native meta transactions
    // never use msg.sender directly, use _msgSender() instead
    function _msgSender()
        internal
        override
        view
        returns (address sender)
    {
        return ContextMixin.msgSender();
    }

    //ERC165 support
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC2981, ERC1155, AccessControl) returns (bool) {
        return ERC1155.supportsInterface(interfaceId) ||
               ERC2981.supportsInterface(interfaceId) ||
               AccessControl.supportsInterface(interfaceId);
    }


    function isApprovedForAll(
        address owner,
        address operator
    ) public override view returns (bool isOperator) {
        if (metaTransactionOperator != 0x0000000000000000000000000000000000000000 && operator == metaTransactionOperator) {
            return true;
        }

        return ERC1155.isApprovedForAll(owner, operator);
    }

    function setupMetaTransactionOperator(address newMetaTransactionOperator) external only(DEFAULT_ADMIN_ROLE) {
        metaTransactionOperator = newMetaTransactionOperator;
    }

    /**
     * @notice called when tokens are deposited on root chain
     * @dev Should be callable only by ChildChainManager
     * Should handle deposit by minting the required tokens for user
     * Make sure minting is done only by this function
     * @param user user address for whom deposit is being done
     * @param depositData abi encoded ids array and amounts array
     */
    function deposit(address user, bytes calldata depositData)
        external
        override
        only(DEPOSITOR_ROLE)
    {
        (
            uint256[] memory ids,
            uint256[] memory amounts,
            bytes memory data
        ) = abi.decode(depositData, (uint256[], uint256[], bytes));

        require(
            user != address(0),
            "LempiverseChildMintableERC1155: INVALID_DEPOSIT_USER"
        );

        _mintBatch(user, ids, amounts, data);
    }

    /**
     * @notice called when user wants to withdraw single token back to root chain
     * @dev Should burn user's tokens. This transaction will be verified when exiting on root chain
     * @param id id to withdraw
     * @param amount amount to withdraw
     */
    function withdrawSingle(uint256 id, uint256 amount) external {
        _burn(_msgSender(), id, amount);
    }

    /**
     * @notice called when user wants to batch withdraw tokens back to root chain
     * @dev Should burn user's tokens. This transaction will be verified when exiting on root chain
     * @param ids ids to withdraw
     * @param amounts amounts to withdraw
     */
    function withdrawBatch(uint256[] calldata ids, uint256[] calldata amounts)
        external
    {
        _burnBatch(_msgSender(), ids, amounts);
    }

    /**
     * @notice See definition of `_mint` in ERC1155 contract
     * @dev This implementation only allows admins to mint tokens
     * but can be changed as per requirement
     */
    function mint(
        address account,
        uint256 id,
        uint256 amount,
        bytes calldata data
    ) external only(DEFAULT_ADMIN_ROLE) {
        _mint(account, id, amount, data);
    }

    /**
     * @notice See definition of `_mintBatch` in ERC1155 contract
     * @dev This implementation only allows admins to mint tokens
     * but can be changed as per requirement
     */
    function mintBatch(
        address to,
        uint256[] calldata ids,
        uint256[] calldata amounts,
        bytes calldata data
    ) external only(DEFAULT_ADMIN_ROLE) {
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
