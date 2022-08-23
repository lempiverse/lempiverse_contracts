
const { BN, constants, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

const hre = require("hardhat");

const { MAX_UINT256, ZERO_ADDRESS, ZERO_BYTES32 } = constants;



describe('Garbage', function () {

  let Garbage;
  let LempiverseChildMintableERC1155;


  let garbage;
  let token;

  let chainId;

  const tokenId = "11";



  let adminRole;


  const privKey1 = "59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";
  const key1 = Uint8Array.from(Buffer.from(privKey1, "hex"));

  async function getOper() {
    const [_, oper] = await hre.ethers.getSigners();
    return oper;
  }

  async function getOperAddress() {
    return await(await getOper()).getAddress();
  }


  beforeEach(async function () {

    Garbage = await hre.ethers.getContractFactory('Garbage');
    LempiverseChildMintableERC1155 = await hre.ethers.getContractFactory('LempiverseChildMintableERC1155');


    garbage = await Garbage.deploy();
    token = await LempiverseChildMintableERC1155.deploy('0x0000000000000000000000000000000000000000');



    chainId = parseInt(await token.getChainId());

    adminRole = await token.DEFAULT_ADMIN_ROLE();
  });




  it('Garbage no resetup true->false', async function () {
      await garbage.setup(true);
      await expect(garbage.setup(false))
        .to.be.revertedWith("only once allowed");
  })

  it('Garbage no resetup false->true', async function () {
      await garbage.setup(false);
      await expect(garbage.setup(true))
        .to.be.revertedWith("only once allowed");
  })

  it('Garbage not allowed transfer', async function () {
      await garbage.setup(false);

      const num = 2;
      const oper = await getOperAddress();
      await token.mint(oper, tokenId, num, 0x0);
      await token.mint(oper, tokenId+1, num+1, 0x0);
      expect(await token.balanceOf(oper, tokenId)).to.be.equal(num);
      expect(await token.balanceOf(oper, tokenId+1)).to.be.equal(num+1);

      expect(await token.balanceOf(garbage.address, tokenId)).to.be.equal(0);
      expect(await token.balanceOf(garbage.address, tokenId+1)).to.be.equal(0);

      await expect(token.connect(await getOper()).safeTransferFrom(oper, garbage.address, tokenId, num, 0x0))
          .to.be.revertedWith("ERC1155: ERC1155Receiver rejected tokens");

      await expect(token.connect(await getOper()).safeBatchTransferFrom(oper, garbage.address,
                          [tokenId, tokenId+1], [num,num+1], 0x0))
          .to.be.revertedWith("ERC1155: ERC1155Receiver rejected tokens");

      expect(await token.balanceOf(oper, tokenId)).to.be.equal(num);
      expect(await token.balanceOf(oper, tokenId+1)).to.be.equal(num+1);

      expect(await token.balanceOf(garbage.address, tokenId)).to.be.equal(0);
      expect(await token.balanceOf(garbage.address, tokenId+1)).to.be.equal(0);
  })

  it('Garbage allowed transfer', async function () {
      await garbage.setup(true);

      const num = 2;
      const oper = await getOperAddress();
      await token.mint(oper, tokenId, num, 0x0);
      await token.mint(oper, tokenId+1, num+1, 0x0);
      expect(await token.balanceOf(oper, tokenId)).to.be.equal(num);
      expect(await token.balanceOf(oper, tokenId+1)).to.be.equal(num+1);

      expect(await token.balanceOf(garbage.address, tokenId)).to.be.equal(0);
      expect(await token.balanceOf(garbage.address, tokenId+1)).to.be.equal(0);

      await token.connect(await getOper()).safeTransferFrom(oper, garbage.address, tokenId, num, 0x0);

      expect(await token.balanceOf(oper, tokenId)).to.be.equal(0);
      expect(await token.balanceOf(oper, tokenId+1)).to.be.equal(num+1);

      expect(await token.balanceOf(garbage.address, tokenId)).to.be.equal(num);
      expect(await token.balanceOf(garbage.address, tokenId+1)).to.be.equal(0);

      expect(await token.totalSupply(tokenId)).to.be.equal(num);
      expect(await token.totalSupply(tokenId+1)).to.be.equal(num+1);


      await token.mint(oper, tokenId, num, 0x0);
      expect(await token.balanceOf(oper, tokenId)).to.be.equal(num);

      await token.connect(await getOper()).safeBatchTransferFrom(oper, garbage.address,
                          [tokenId, tokenId+1], [num,num+1], 0x0);

      expect(await token.balanceOf(oper, tokenId)).to.be.equal(0);
      expect(await token.balanceOf(oper, tokenId+1)).to.be.equal(0);

      expect(await token.balanceOf(garbage.address, tokenId)).to.be.equal(num+num);
      expect(await token.balanceOf(garbage.address, tokenId+1)).to.be.equal(num+1);

      expect(await token.totalSupply(tokenId)).to.be.equal(num+num);
      expect(await token.totalSupply(tokenId+1)).to.be.equal(num+1);

      await garbage.connect(await getOper()).burn(token.address, [tokenId, tokenId+1]);

      expect(await token.balanceOf(garbage.address, tokenId)).to.be.equal(0);
      expect(await token.balanceOf(garbage.address, tokenId+1)).to.be.equal(0);

      expect(await token.totalSupply(tokenId)).to.be.equal(0);
      expect(await token.totalSupply(tokenId+1)).to.be.equal(0);
  })

})