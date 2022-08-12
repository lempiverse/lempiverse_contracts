const { BN, constants, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { fromRpcSig } = require('ethereumjs-util');
const ethSigUtil = require('eth-sig-util');
const Wallet = require('ethereumjs-wallet').default;
const { expect } = require('chai');


const hre = require("hardhat");

const { MAX_UINT256, ZERO_ADDRESS, ZERO_BYTES32 } = constants;

const { EIP712Domain, Permit, domainSeparator } = require('./eip712');




describe('Minter', function () {

  let LempiverseNftEggMinter;
  let UChildAdministrableERC20;
  let LempiverseChildMintableERC1155;

  let paymentToken;
  let minter;
  let token;

  let chainId;

  const name = 'USD token';
  const symbol = 'USD';
  const version = '1';

  const tokenId = "11";
  const mintLimit = 10;


  const privKey1 = "59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";
  const key1 = Uint8Array.from(Buffer.from(privKey1, "hex"));

  const price = 10;
  const nonce = 0;
  const maxDeadline = MAX_UINT256;


  async function getBuyer() {
    const [_, buyerS] = await hre.ethers.getSigners();
    return buyerS;
  }

  async function getBuyerAddress() {
    return await(await getBuyer()).getAddress();
  }

  async function getAdmin() {
    const [admin] = await hre.ethers.getSigners();
    return admin;
  }



  beforeEach(async function () {
    const buyer = await getBuyerAddress();

    LempiverseNftEggMinter = await hre.ethers.getContractFactory('LempiverseNftEggMinter');
    UChildAdministrableERC20 = await hre.ethers.getContractFactory('UChildAdministrableERC20');
    LempiverseChildMintableERC1155 = await hre.ethers.getContractFactory('LempiverseChildMintableERC1155');


    paymentToken = await UChildAdministrableERC20.deploy();
    minter = await LempiverseNftEggMinter.deploy();
    token = await LempiverseChildMintableERC1155.deploy('0x0000000000000000000000000000000000000000');

    await paymentToken.initialize(name, symbol, 6);
    await paymentToken.mint(buyer, 10000 * 1e6);

    chainId = parseInt(await paymentToken.getChainId());

    await minter.setup(paymentToken.address, token.address, price, tokenId, mintLimit);

  });


  function encodeIntAsByte32(digit) {
    var array = new Array(32).fill(0);
    var n = digit
    for (var i = 0; i<4; i++) {
        array[31-i] = n & 0xff
        n >>= 8
    }
    return array;
  }


  const buildData = (salt, verifyingContract, owner, spender, value, deadline = maxDeadline) => ({
    primaryType: 'Permit',
    types: { EIP712Domain, Permit },
    domain: { name, version, verifyingContract, salt },
    message: { owner, spender, value, nonce, deadline },
  });

  async function buildVRS (buyer, value) {
    const data = buildData(encodeIntAsByte32(chainId), paymentToken.address, buyer, minter.address, value);
    const signature = ethSigUtil.signTypedMessage(key1, { data });
    return fromRpcSig(signature);
  };



  it('Should revert with sale is inactive', async function () {

    const { v, r, s } = await buildVRS(await getBuyerAddress(), 1);

    await expect(minter.mint(1, maxDeadline.toString(), v, r, s)).to.be.revertedWith("sale is inactive");
  });

  it('Should revert on no permission for start/stop sale', async function () {

    const buyer = await getBuyer();

    await expect(minter.connect(buyer).startSale()).to.be.revertedWith("LempiverseNftEggMinter: INSUFFICIENT_PERMISSIONS");
    await expect(minter.connect(buyer).stopSale()).to.be.revertedWith("LempiverseNftEggMinter: INSUFFICIENT_PERMISSIONS");
  });


  it('domain separator', async function () {
    const array = encodeIntAsByte32(chainId);
    const array8 = Uint8Array.from(array);

    const buff = Uint8Array.from(Buffer.from((await paymentToken.getChainId32()).toString().slice(2), "hex"));

    expect(buff.toString()).to.equal(array8.toString());

    const myDs = await domainSeparator(name, version, paymentToken.address, array);
    expect(await paymentToken.DOMAIN_SEPARATOR()).to.equal(myDs);
  });


  async function mintOrNotToMint(mode) {
    const amount = 1;
    const value = amount * price;

    const buyer = await getBuyer();
    const buyerAddress = await getBuyerAddress();
    const { v, r, s } = await buildVRS(buyerAddress, value);

    const adminRole = await paymentToken.DEFAULT_ADMIN_ROLE();

    if (mode != 1) {
      await token.grantRole(adminRole, minter.address);
    }


    const receiptSale = await minter.startSale();

    expect(await paymentToken.nonces(buyerAddress)).to.equal(0);

    if (mode == 1) {
      await expect(minter.connect(buyer).mint(
                            amount.toString(),
                            maxDeadline.toString(),
                            v, r, s)).to.be.revertedWith("LempiverseChildMintableERC1155: INSUFFICIENT_PERMISSIONS");
    } else {

      expect(await paymentToken.balanceOf(minter.address)).to.be.equal(0);

      await expect(minter.connect(buyer).mint(amount.toString(), maxDeadline.toString(), v, r, s))
        .to.emit(token, "TransferSingle")
        .withArgs(minter.address, ZERO_ADDRESS, buyerAddress, tokenId, amount)
        .to.emit(paymentToken, "Transfer")
        .withArgs(buyerAddress, minter.address, value)

      expect(await paymentToken.nonces(buyerAddress)).to.equal(1);

      expect(await paymentToken.balanceOf(minter.address)).to.be.equal(value);

      await rescueRevert(value);
      await rescueOk(value);
    }
  };

  async function rescueOk(value) {

    const [_, __, rescue] = await hre.ethers.getSigners();
    const rescueAddress = await rescue.getAddress()

    const admin = await getAdmin()
    const adminAddress = await admin.getAddress()


    const rescueRole = await minter.RESCUER_ROLE();
    await minter.grantRole(rescueRole, rescueAddress);

    expect(await paymentToken.balanceOf(rescueAddress)).to.be.equal(0);

    await expect(minter.connect(rescue).rescueERC20(paymentToken.address, rescueAddress, value))
      .to.emit(paymentToken, "Transfer")
      .withArgs(minter.address, rescueAddress, value)

    expect(await paymentToken.balanceOf(rescueAddress)).to.be.equal(value);
  }

  async function rescueRevert(value) {
    const admin = await getAdmin();
    const adminAddress = await admin.getAddress();
    await expect(minter.connect(admin).rescueERC20(paymentToken.address, adminAddress, value))
      .to.be.revertedWith("LempiverseNftEggMinter: INSUFFICIENT_PERMISSIONS");
  }


  it('Should revert on LempiverseChildMintableERC1155: INSUFFICIENT_PERMISSIONS', async function () {
    await mintOrNotToMint(1);
  });


  it('accepts owner signature', async function () {
    await mintOrNotToMint(0);
  });

});


