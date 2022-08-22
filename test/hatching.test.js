const { BN, constants, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

const hre = require("hardhat");
const BigNumber = hre.ethers.BigNumber;

const { MAX_UINT256, ZERO_ADDRESS, ZERO_BYTES32 } = constants;



describe('Hatching', function () {

  let LempiverseHatching;
  let VRFCoordinatorV2Mock;
  let Garbage;
  let LempiverseChildMintableERC1155;


  let garbage;
  let hatching;
  let token;
  let vrfCoordinator;

  let chainId;

  const tokenId = "11";

  const mumbayKeyHash = "0x4b09e658ed251bcafeebbc69400383d49f344ace09b9576fe248bb02c003fe9f";

  const distribIds = [1000, 1001, 1002];
  const distribWeights = [10, 20, 30];


  let adminRole;

  let vrfSubId;


  const privKey1 = "59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";
  const key1 = Uint8Array.from(Buffer.from(privKey1, "hex"));

  async function getOper() {
    const [_, oper] = await hre.ethers.getSigners();
    return oper;
  }

  async function getOperAddress() {
    return await(await getOper()).getAddress();
  }

  async function getAdmin() {
    const [admin] = await hre.ethers.getSigners();
    return admin;
  }

  async function getAdminAddress() {
    return await(await getAdmin()).getAddress();
  }

  const capturePayment = (value) => {
    console.log("capturePayment", value);
    return true
  }

  const checkDistrib = async (tokenId, ids, weights) => {

    expect(weights.length).to.equal(ids.length);
    const distrib = await hatching.getDistribution(tokenId);
    expect(distrib.tokenIds.length).to.equal(weights.length);
    expect(distrib.weights.length).to.equal(weights.length);

    var total = 0;
    for (var i=0; i<distrib.tokenIds.length; i++) {
      expect(distrib.tokenIds[i]).to.equal(ids[i]);
      expect(distrib.weights[i]).to.equal(weights[i]);
      total += distrib.weights[i];
    }
    expect(distrib.total).to.equal(total);
  }

  beforeEach(async function () {

    LempiverseHatching = await hre.ethers.getContractFactory('LempiverseHatching');
    VRFCoordinatorV2MockEx = await hre.ethers.getContractFactory('VRFCoordinatorV2MockEx');
    Garbage = await hre.ethers.getContractFactory('Garbage');
    LempiverseChildMintableERC1155 = await hre.ethers.getContractFactory('LempiverseChildMintableERC1155');


    garbage = await Garbage.deploy();
    vrfCoordinator = await VRFCoordinatorV2MockEx.deploy(1, 1);
    token = await LempiverseChildMintableERC1155.deploy('0x0000000000000000000000000000000000000000');
    hatching = await LempiverseHatching.deploy(vrfCoordinator.address, token.address, garbage.address);

    await garbage.setup(true);

    await vrfCoordinator.createSubscription();
    vrfSubId = await vrfCoordinator.getLastSubscription();
    await vrfCoordinator.fundSubscription(vrfSubId.toString(), 1000_000_000_000);
    await vrfCoordinator.addConsumer(vrfSubId.toString(), hatching.address);

    await hatching.setupEggsBulkLimit(200);

    await hatching.setupVRF(2500000, 3, mumbayKeyHash, vrfSubId.toString());


    await hatching.setupDistribution(tokenId, distribIds, distribWeights);

    chainId = parseInt(await token.getChainId());

    adminRole = await token.DEFAULT_ADMIN_ROLE();

    await token.grantRole(adminRole, hatching.address);

  });



  it('distribution setup and get', async function () {

      const newTokenId = 11111;
      const unexistsTokenId = 99999;
      const ids = [10000, 10001, 10002, 10003];
      const weights = [1, 2, 3, 4];

      expect(await hatching.canHatch(tokenId)).to.be.equal(true);
      expect(await hatching.canHatch(newTokenId)).to.be.equal(false);
      expect(await hatching.canHatch(unexistsTokenId)).to.be.equal(false);

      await hatching.setupDistribution(newTokenId, ids, weights);
      expect(await hatching.canHatch(newTokenId)).to.be.equal(true);
      expect(await hatching.canHatch(tokenId)).to.be.equal(true);
      expect(await hatching.canHatch(unexistsTokenId)).to.be.equal(false);


      await checkDistrib(newTokenId, ids, weights);
      await checkDistrib(tokenId, distribIds, distribWeights);
      await checkDistrib(unexistsTokenId, [], []);

      await hatching.setupDistribution(newTokenId, [], []);

      await checkDistrib(newTokenId, [], []);
      await checkDistrib(tokenId, distribIds, distribWeights);
      await checkDistrib(unexistsTokenId, [], []);

      expect(await hatching.canHatch(newTokenId)).to.be.equal(false);
      expect(await hatching.canHatch(tokenId)).to.be.equal(true);
      expect(await hatching.canHatch(unexistsTokenId)).to.be.equal(false);
  })


  async function baseFlow(rnds, pattern) {
    const oper = await getOperAddress();

    const num = rnds.length;

    distribIds.map(async (x) => { expect(await token.totalSupply(x)).to.be.equal(0) } )
    expect(await token.totalSupply(tokenId)).to.be.equal(0);
    expect(await token.balanceOf(oper, tokenId)).to.be.equal(0);
    expect(await token.balanceOf(hatching.address, tokenId)).to.be.equal(0);
    distribIds.map(async (x) => { expect(await token.balanceOf(oper, x)).to.be.equal(0); } )

    expect(await token.balanceOf(garbage.address, tokenId)).to.be.equal(0);


    await token.mint(oper, tokenId, num, 0x0);

    expect(await token.totalSupply(tokenId)).to.be.equal(num);

    expect(await token.balanceOf(oper, tokenId)).to.be.equal(num);
    expect(await token.balanceOf(hatching.address, tokenId)).to.be.equal(0);

    await token.connect(await getOper()).safeTransferFrom(oper, hatching.address, tokenId, num, 0x0);

    expect(await token.balanceOf(oper, tokenId)).to.be.equal(0);
    expect(await token.balanceOf(hatching.address, tokenId)).to.be.equal(num);
    distribIds.map(async (x) => { expect(await token.balanceOf(oper, x)).to.be.equal(0); } )

    expect(await token.balanceOf(garbage.address, tokenId)).to.be.equal(0);
    distribIds.map(async (x) => { expect(await token.totalSupply(x)).to.be.equal(0); } )


    const reqId = 1;

    await expect(vrfCoordinator.fulfillRandomWordsWithOverride(reqId, hatching.address, rnds))
        .to.emit(vrfCoordinator, "RandomWordsFulfilled")
        .withArgs(reqId, reqId, anyValue, true)

    // console.log(await Promise.all(distribIds.map(async x => token.balanceOf(oper, x) )))

    const checkDistribPattern = async (f) => {
      expect(await Promise.all(distribIds.map(async x => f(x) ))).to.deep.equal(pattern);
    }


    expect(await token.balanceOf(oper, tokenId)).to.be.equal(0);
    expect(await token.balanceOf(hatching.address, tokenId)).to.be.equal(0);
    checkDistribPattern(async x => token.balanceOf(oper, x));
    expect(await token.balanceOf(garbage.address, tokenId)).to.be.equal(num);
    expect(await token.totalSupply(tokenId)).to.be.equal(num);

    checkDistribPattern(async x => token.totalSupply(x));

    await garbage.burn(token.address, [tokenId]);
    expect(await token.balanceOf(garbage.address, tokenId)).to.be.equal(0);

    expect(await token.totalSupply(tokenId)).to.be.equal(0);

    checkDistribPattern(async x => token.totalSupply(x));
  }

  it('base flow 1', async function () {
    await baseFlow([1], [1,0,0])
  })

  it('base flow 2', async function () {
    await baseFlow([1, 1], [2,0,0])
  })

  it('base flow 5', async function () {
    await baseFlow([1,1,1,1,1], [5,0,0])
  })

  it('base flow 5-321', async function () {
    await baseFlow([1,11,12,1,50], [2,2,1])
  })

  it('base flow 5-401', async function () {
    await baseFlow([1,8,8,1,50], [4,0,1])
  })

  it('base flow 5-041', async function () {
    await baseFlow([14,18,18,17,50], [0,4,1])
  })

  it('base flow 5-050', async function () {
    await baseFlow([14,18,18,17,14], [0,5,0])
  })

  it('base flow 5-005', async function () {
    await baseFlow([54,58,58,57,54], [0,0,5])
  })

})

