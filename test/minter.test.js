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
  const mintAmount = new BN(2);


  const privKey1 = "ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
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


  beforeEach(async function () {
    const buyer = await getBuyerAddress();

    LempiverseNftEggMinter = await hre.ethers.getContractFactory('LempiverseNftEggMinter');
    UChildAdministrableERC20 = await hre.ethers.getContractFactory('UChildAdministrableERC20');
    LempiverseChildMintableERC1155 = await hre.ethers.getContractFactory('LempiverseChildMintableERC1155');


    paymentToken = await UChildAdministrableERC20.deploy();
    minter = await LempiverseNftEggMinter.deploy();
    token = await LempiverseChildMintableERC1155.deploy('0x0000000000000000000000000000000000000000');

    console.log(paymentToken.address, buyer, minter.address);

    await paymentToken.initialize(name, symbol, 6);
    await paymentToken.mint(buyer, 10000 * 1e6);

    chainId = parseInt(await paymentToken.getChainId());
    // chainId = parseInt(await hre.network.provider.send("eth_chainId"));
    console.log(chainId);

    await minter.setup(paymentToken.address, token.address, price, tokenId, mintLimit);

  });




  const buildData = (chainId, verifyingContract, owner, spender, value, deadline = maxDeadline) => ({
    primaryType: 'Permit',
    types: { EIP712Domain, Permit },
    domain: { name, version, chainId, verifyingContract },
    message: { owner, spender, value, nonce, deadline },
  });

  async function buildVRS (buyer, value) {
    const data = buildData(chainId, paymentToken.address, buyer, minter.address, value);
    const signature = ethSigUtil.signTypedMessage(key1, { data });
    return fromRpcSig(signature);
  };



  it('Should revert with sale is inactive', async function () {

    const { v, r, s } = await buildVRS(await getBuyerAddress(), 1);

    await expect(minter.mint(1, maxDeadline.toString(), v, r, s)).to.be.revertedWith("sale is inactive");
  });

  it('accepts owner signature', async function () {

    const amount = 1;
    const value = amount * price;

    const buyer = await getBuyer();
    const buyerAddress = await getBuyerAddress();
    const { v, r, s } = await buildVRS(buyerAddress, value);

    console.log(buyer);

    expect(await paymentToken.nonces(buyerAddress)).to.equal(0);

    const receiptSale = await minter.startSale();

    const receiptMint = await minter.connect(buyer).mint(amount, maxDeadline.toString(), v, r, s);

    // expect(await paymentToken.nonces(buyer)).to.equal(1);

  });

      // context('with minted tokens', function () {
      //   beforeEach(async function () {
      //     (this.receipt = await this.minter.mint(tokenHolder, tokenId, mintAmount, data, { from: operator }));
      //   });

      //   it('emits a TransferSingle event', function () {
      //     expectEvent(this.receipt, 'TransferSingle', {
      //       operator,
      //       from: ZERO_ADDRESS,
      //       to: tokenHolder,
      //       id: tokenId,
      //       value: mintAmount,
      //     });
      //   });

      //   it('credits the minted amount of tokens', async function () {
      //     expect(await this.token.balanceOf(tokenHolder, tokenId)).to.be.bignumber.equal(mintAmount);
      //   });


      // });

});


