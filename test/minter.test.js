const { BN, constants, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');


const hre = require("hardhat");

const { MAX_UINT256, ZERO_ADDRESS, ZERO_BYTES32 } = constants;

const { calcMetaTxVRS, calcPermitVRS, encodeIntAsByte32, domainSeparator } = require('./eip712');


describe('Minter', function () {

  let LempiverseNftEggMinter;
  let UChildAdministrableERC20;
  let LempiverseChildMintableERC1155;


  let paymentToken;
  let minter;
  let token;

  let chainId;

  const paymentTokenName = 'USD token';
  const paymentTokenSymbol = 'USD';

  const tokenId = "11";
  const mintLimit = 10;

  let adminRole;


  const privKey1 = "59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";
  const key1 = Uint8Array.from(Buffer.from(privKey1, "hex"));

  const price = 10;
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

    await paymentToken.initialize(paymentTokenName, paymentTokenSymbol, 6);
    await paymentToken.mint(buyer, 10000 * 1e6);

    chainId = parseInt(await paymentToken.getChainId());

    await minter.setup(paymentToken.address, token.address);
    await minter.setupPosition(tokenId, price, mintLimit);

    adminRole = await paymentToken.DEFAULT_ADMIN_ROLE();

  });


  async function metaTxApprove() {

    const paymentTokenIFace = UChildAdministrableERC20.interface;

    const minterName = "LempiverseNftEggMinter";

    const buyerAddress = await getBuyerAddress();

    // const nonceMetaTx = await paymentToken.getNonce(buyerAddress);
    const nonceMetaTx = await paymentToken.nonces(buyerAddress);

    const functionSignature = await paymentTokenIFace.encodeFunctionData(
            "approve", [minter.address, "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"]);


    const metaSig = calcMetaTxVRS(paymentTokenName, key1, buyerAddress, paymentToken.address, functionSignature, nonceMetaTx.toString(), chainId);

    const [_, __, metaTxSender] = await hre.ethers.getSigners();


    await expect(paymentToken.connect(metaTxSender).executeMetaTransaction(buyerAddress, functionSignature, metaSig.r, metaSig.s, metaSig.v))
        .to.emit(paymentToken, "Approval");
  }



  async function metaTxMint(amount, initNonce, mustFail=false) {

    const minterIFace = LempiverseNftEggMinter.interface;

    const value = amount * price;

    const minterName = "LempiverseNftEggMinter";

    const buyer = await getBuyer();
    const buyerAddress = await getBuyerAddress();

    const { v, r, s } = calcPermitVRS(
                                  paymentTokenName, key1,
                                  buyerAddress,
                                  paymentToken.address,
                                  minter.address,
                                  value, initNonce, chainId, maxDeadline);

    const functionSignature = await minterIFace.encodeFunctionData(
            "buy", [amount.toString(), tokenId.toString()]);

    const [_, __, metaTxSender] = await hre.ethers.getSigners();

    const nonceMetaTx = await minter.getNonce(buyerAddress);
    const metaSig = calcMetaTxVRS(minterName, key1, buyerAddress, minter.address, functionSignature, nonceMetaTx.toString(), chainId);


    const initNftBal = await token.balanceOf(buyerAddress, tokenId);
    const initMinterBalance = await paymentToken.balanceOf(minter.address);

    if (mustFail) {
      await expect(minter.connect(metaTxSender).executeMetaTransaction(buyerAddress, functionSignature, metaSig.r, metaSig.s, metaSig.v))
        .to.be.revertedWith("Function call not successful");
    } else {

      await expect(minter.connect(metaTxSender).executeMetaTransaction(buyerAddress, functionSignature, metaSig.r, metaSig.s, metaSig.v))
          .to.emit(token, "TransferSingle")
          .withArgs(minter.address, ZERO_ADDRESS, buyerAddress, tokenId, amount)
          .to.emit(paymentToken, "Transfer")
          .withArgs(buyerAddress, minter.address, value);

      expect(await paymentToken.balanceOf(minter.address)).to.be.equal(parseInt(initMinterBalance) + parseInt(value));
      expect(await token.balanceOf(buyerAddress, tokenId)).to.be.equal(parseInt(initNftBal) + parseInt(amount));
    }
  }


  it('meta-tx', async function () {
    await minter.startSale();
    await token.grantRole(adminRole, minter.address);
    await metaTxApprove();
    await metaTxMint(3, 0);
  });

  it('meta-tx revert w/o approve', async function () {
    await minter.startSale();
    await token.grantRole(adminRole, minter.address);

    await metaTxMint(3, 0, true);
  });

  it('meta-tx several times', async function () {
    await minter.startSale();
    await token.grantRole(adminRole, minter.address);
    await metaTxApprove();
    await metaTxMint(3, 0);
    await metaTxMint(1, 1);
    await metaTxMint(5, 2);
  });


  it('Should revert with sale is inactive', async function () {

    const { v, r, s } = calcPermitVRS(
                                paymentTokenName, key1,
                                await getBuyerAddress(),
                                paymentToken.address,
                                minter.address,
                                1, 0, chainId, maxDeadline);

    await expect(minter.buyPermit(1, tokenId.toString(), maxDeadline.toString(), v, r, s)).to.be.revertedWith("sale is inactive");
  });

  it('Should revert with wrong tokenId', async function () {

    await minter.startSale();
    const { v, r, s } = calcPermitVRS(
                                paymentTokenName, key1,
                                await getBuyerAddress(),
                                paymentToken.address,
                                minter.address,
                                1, 0, chainId, maxDeadline);

    await expect(minter.buyPermit(1, "9999", maxDeadline.toString(), v, r, s)).to.be.revertedWith("wrong tokenId");
  });

  it('Should revert with wrong qty', async function () {

    await minter.startSale();
    const { v, r, s } = calcPermitVRS(
                                paymentTokenName, key1,
                                await getBuyerAddress(),
                                paymentToken.address,
                                minter.address,
                                1, 0, chainId, maxDeadline);

    await expect(minter.buyPermit(0, tokenId.toString(), maxDeadline.toString(), v, r, s)).to.be.revertedWith("wrong qty");
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

    const myDs = domainSeparator(paymentTokenName, paymentToken.address, array);
    expect(await paymentToken.DOMAIN_SEPARATOR()).to.equal(myDs);
  });


  async function mintOrNotToMintCore(mode, tokenPrice, tokenIdToMint, amount, initRescueUsd, initNonce=0) {
    const value = amount * tokenPrice;

    const buyer = await getBuyer();
    const buyerAddress = await getBuyerAddress();
    const { v, r, s } = calcPermitVRS(
                                paymentTokenName, key1,
                                buyerAddress,
                                paymentToken.address,
                                minter.address,
                                value, initNonce, chainId, maxDeadline);


    if (mode != 1) {
      await token.grantRole(adminRole, minter.address);
    }


    expect(await paymentToken.nonces(buyerAddress)).to.equal(initNonce);

    if (mode == 1) {
      await expect(minter.connect(buyer).buyPermit(
                            amount.toString(),
                            tokenIdToMint.toString(),
                            maxDeadline.toString(),
                            v, r, s)).to.be.revertedWith("LempiverseChildMintableERC1155: INSUFFICIENT_PERMISSIONS");
    } else {

      expect(await paymentToken.balanceOf(minter.address)).to.be.equal(0);

      const initNftBal = await token.balanceOf(buyerAddress, tokenIdToMint);

      await expect(minter.connect(buyer).buyPermit(amount.toString(), tokenIdToMint.toString(), maxDeadline.toString(), v, r, s))
        .to.emit(token, "TransferSingle")
        .withArgs(minter.address, ZERO_ADDRESS, buyerAddress, tokenIdToMint, amount)
        .to.emit(paymentToken, "Transfer")
        .withArgs(buyerAddress, minter.address, value)

      expect(await paymentToken.nonces(buyerAddress)).to.equal(initNonce+1);

      expect(await paymentToken.balanceOf(minter.address)).to.be.equal(value);

      expect(await token.balanceOf(buyerAddress, tokenIdToMint)).to.be.equal(parseInt(initNftBal) + parseInt(amount));

      await rescueRevert(value);
      await rescueOk(value, initRescueUsd);
    }
  };

  async function mintOrNotToMint(mode, amount, initRescueUsd, initNonce=0) {
    await mintOrNotToMintCore(mode, price, tokenId, amount, initRescueUsd, initNonce);
  }

  async function rescueOk(value, initRescueUsd) {

    const [_, __, rescue] = await hre.ethers.getSigners();
    const rescueAddress = await rescue.getAddress()

    const admin = await getAdmin()
    const adminAddress = await admin.getAddress()


    const rescueRole = await minter.RESCUER_ROLE();
    await minter.grantRole(rescueRole, rescueAddress);

    expect(await paymentToken.balanceOf(rescueAddress)).to.be.equal(initRescueUsd);

    await expect(minter.connect(rescue).rescueERC20(paymentToken.address, rescueAddress, value))
      .to.emit(paymentToken, "Transfer")
      .withArgs(minter.address, rescueAddress, value)

    expect(await paymentToken.balanceOf(rescueAddress)).to.be.equal(value+initRescueUsd);
  }

  async function rescueRevert(value) {
    const admin = await getAdmin();
    const adminAddress = await admin.getAddress();
    await expect(minter.connect(admin).rescueERC20(paymentToken.address, adminAddress, value))
      .to.be.revertedWith("LempiverseNftEggMinter: INSUFFICIENT_PERMISSIONS");
  }


  it('Should revert with LempiverseChildMintableERC1155: INSUFFICIENT_PERMISSIONS', async function () {
    await minter.startSale();
    await mintOrNotToMint(1, 1, 0);
  });


  it('mint with signature', async function () {
    await minter.startSale();
    await mintOrNotToMint(0, 1, 0);
  });

  it('mint with signature several amount', async function () {
    await minter.startSale();
    await mintOrNotToMint(0, 10, 0);
  });

  it('mint with signature several times', async function () {
    await minter.startSale();
    await mintOrNotToMint(0, 2, 0, 0);
    await mintOrNotToMint(0, 3, 20, 1);
    await mintOrNotToMint(0, 1, 20+30, 2);
  });

  it('Should revert with limit exceed', async function () {
    await minter.startSale();
    await mintOrNotToMint(0, 5, 0, 0);
    await expect(mintOrNotToMint(0, 6, 50, 1))
      .to.be.revertedWith("limit exceed");
  });

  it('Should revert after sale with sale is inactive', async function () {

    await minter.startSale();
    await mintOrNotToMint(0, 5, 0, 0);

    await minter.stopSale();

    await expect(mintOrNotToMint(0, 1, 50, 1))
      .to.be.revertedWith("sale is inactive");
  });

  it('setup* can be called only by admin', async function () {
    await expect(minter.connect(await getBuyer()).setup(paymentToken.address, token.address))
      .to.be.revertedWith("LempiverseNftEggMinter: INSUFFICIENT_PERMISSIONS");

    await expect(minter.connect(await getBuyer()).setupPosition(tokenId, price, mintLimit))
      .to.be.revertedWith("LempiverseNftEggMinter: INSUFFICIENT_PERMISSIONS");
  });

  it('minting two kind of tokens', async function () {
    const tokenId2 = "22";
    await minter.setupPosition(tokenId2, price*2, mintLimit*2);

    var [priceOut, mintLimitOut] = await minter.positions(tokenId);
    expect(priceOut).to.equal(price);
    expect(mintLimitOut).to.equal(mintLimit);

    var [priceOut2, mintLimitOut2] = await minter.positions(tokenId2);
    expect(priceOut2).to.equal(price*2);
    expect(mintLimitOut2).to.equal(mintLimit*2);

    await minter.startSale();
    await mintOrNotToMintCore(0, price*2, tokenId2, 1, 0, 0);
    await mintOrNotToMintCore(0, price, tokenId, 1, 20, 1);

    const buyerAddress = await getBuyerAddress();
    expect(await token.balanceOf(buyerAddress, tokenId2)).to.be.equal(1);
    expect(await token.balanceOf(buyerAddress, tokenId)).to.be.equal(1);

    [priceOut, mintLimitOut] = await minter.positions(tokenId);
    expect(priceOut).to.equal(price);
    expect(mintLimitOut).to.equal(mintLimit-1);

    [priceOut2, mintLimitOut2] = await minter.positions(tokenId2);
    expect(priceOut2).to.equal(price*2);
    expect(mintLimitOut2).to.equal(mintLimit*2-1);

  });


});


