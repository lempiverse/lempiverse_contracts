// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import {AccessControlMixin, AccessControl} from "./AccessControlMixin.sol";
import {NativeMetaTransaction} from "./NativeMetaTransaction.sol";
import {ContextMixin} from "./ContextMixin.sol";
import {SafeERC20, IERC20Permit} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";


interface IMintable {
    function mint(
        address to,
        uint256 id,
        uint256 amount,
        bytes memory data
    ) external;
}


abstract contract LempiverseNftMinter is
    AccessControlMixin,
    NativeMetaTransaction,
    ContextMixin
{
    using SafeERC20 for IERC20;


    enum SaleState {
        CLOSED,
        OPEN
    }

    bytes32 public constant RESCUER_ROLE = keccak256("RESCUER_ROLE");

    address public metaTransactionOperator;
    address public paymentToken;
    address public ierc1155Token;
    uint256 public price;

    SaleState public saleState = SaleState.CLOSED;


    constructor() {

        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
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
    function supportsInterface(bytes4 interfaceId) public view virtual override(AccessControl) returns (bool) {
        return AccessControl.supportsInterface(interfaceId);
    }


    function _spendERC20(
        uint256 qty,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) internal {

        uint amount = price * qty;

        SafeERC20.safePermit(
            IERC20Permit(paymentToken),
            _msgSender(),
            address(this),
            amount,
            deadline,
            v, r, s);

        {
          uint balBefore = IERC20(paymentToken).balanceOf(address(this));
          IERC20(paymentToken).safeTransferFrom(_msgSender(), address(this), amount);
          uint balAfter = IERC20(paymentToken).balanceOf(address(this));
          require (balAfter - balBefore == amount, "failed to recieve payment token");
        }
    }

    function setupMetaTransactionOperator(address newMetaTransactionOperator) external only(DEFAULT_ADMIN_ROLE) {
        metaTransactionOperator = newMetaTransactionOperator;
    }

    function stopSale() external only(DEFAULT_ADMIN_ROLE) {
        saleState = SaleState.CLOSED;
    }

    function startSale() external only(DEFAULT_ADMIN_ROLE) {
        saleState = SaleState.OPEN;
    }

    function rescueERC20(
        IERC20 tokenContract,
        address to,
        uint256 amount
    ) external only(RESCUER_ROLE) {
        tokenContract.safeTransfer(to, amount);
    }
}

contract LempiverseNftEggMinter is LempiverseNftMinter
{
    uint256 public tokenIdToMint;
    uint256 public mintLimit;

    constructor() {
        _setupContractId("LempiverseNftEggMinter");
        _initializeEIP712("LempiverseNftEggMinter");
    }


    function setup(
        address newPaymentToken,
        address newIERC1155Token,
        uint256 newPrice,
        uint256 newTokenIdToMint,
        uint256 newMintLimit

        ) external only(DEFAULT_ADMIN_ROLE) {

        paymentToken = newPaymentToken;
        ierc1155Token = newIERC1155Token;
        price = newPrice;
        tokenIdToMint = newTokenIdToMint;
        mintLimit = newMintLimit;
    }

    function mint(
        uint256 qty,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {

        require (saleState == SaleState.OPEN, "sale is inactive");
        require (tokenIdToMint != 0, "tokenId is not set");
        require (qty > 0, "wrong qty");
        require (mintLimit > 0, "limit exceed");

        _spendERC20(qty, deadline, v, r, s);

        IMintable(ierc1155Token).mint(_msgSender(), tokenIdToMint, qty, bytes(""));

        mintLimit--;
    }

}
