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

    address public paymentToken;
    address public ierc1155Token;

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


    function _spendERC20Permit(
        uint256 amount,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) internal {

        SafeERC20.safePermit(
            IERC20Permit(paymentToken),
            _msgSender(),
            address(this),
            amount,
            deadline,
            v, r, s);

        _spendERC20(amount);
    }

    function _spendERC20(uint256 amount) internal {

        uint balBefore = IERC20(paymentToken).balanceOf(address(this));
        IERC20(paymentToken).safeTransferFrom(_msgSender(), address(this), amount);
        uint balAfter = IERC20(paymentToken).balanceOf(address(this));
        require (balAfter - balBefore == amount, "failed to recieve payment token");
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
    struct Position
    {
        uint256 price;
        uint256 mintLimit;
    }

    mapping (uint256 => Position) public positions;

    constructor() {
        _setupContractId("LempiverseNftEggMinter");
        _initializeEIP712("LempiverseNftEggMinter");
    }


    function setup(
        address newPaymentToken,
        address newIERC1155Token
        ) external only(DEFAULT_ADMIN_ROLE) {

        require(newPaymentToken != 0x0000000000000000000000000000000000000000, "zero newPaymentToken not allowed");
        require(newIERC1155Token != 0x0000000000000000000000000000000000000000, "zero newIERC1155Token not allowed");

        paymentToken = newPaymentToken;
        ierc1155Token = newIERC1155Token;
    }

    function setupPosition(
        uint256 tokenIdToMint,
        uint256 price,
        uint256 mintLimit
        ) external only(DEFAULT_ADMIN_ROLE) {

        require(tokenIdToMint > 0, "tokenIdToMint must be gt 0");
        require(price > 0, "price must be gt 0");
        require(mintLimit > 0, "mintLimit must be gt 0");

        positions[tokenIdToMint] = Position(price, mintLimit);
    }

    function getAndCheckPos(uint256 qty, uint256 tokenIdToMint) internal view returns (Position memory pos) {

        pos = positions[tokenIdToMint];

        require (saleState == SaleState.OPEN, "sale is inactive");
        require (pos.price > 0, "wrong tokenId");
        require (qty > 0, "wrong qty");
        require (pos.mintLimit >= qty, "limit exceed");
    }

    function getPrice(uint256 tokenId) public view returns (uint256 price) {
        price = positions[tokenId].price;
    }


    function buyPermit(
        uint256 qty,
        uint256 tokenIdToMint,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {

        Position memory pos = getAndCheckPos(qty, tokenIdToMint);

        uint256 amount = pos.price * qty;

        _spendERC20Permit(amount, deadline, v, r, s);

        IMintable(ierc1155Token).mint(_msgSender(), tokenIdToMint, qty, bytes(""));

        positions[tokenIdToMint].mintLimit = pos.mintLimit - qty;
    }

    function buy(uint256 qty, uint256 tokenIdToMint) external {

        Position memory pos = getAndCheckPos(qty, tokenIdToMint);

        uint256 amount = pos.price * qty;

        _spendERC20(amount);

        IMintable(ierc1155Token).mint(_msgSender(), tokenIdToMint, qty, bytes(""));

        positions[tokenIdToMint].mintLimit = pos.mintLimit - qty;
    }
}
