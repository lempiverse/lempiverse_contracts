// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");
const { BN } = require('@openzeppelin/test-helpers');
const BigNumber = hre.ethers.BigNumber;


const cmap =
{
  137: {'paymentToken':'0xbd40048A2E8da8c2Ed05879E89a3a61aFFbb8936',
        'token':'0x08bbe53cd50B8F03296E59b7FD4AEA325546921a'},

  80001: {'paymentToken':'0x101a89d19fe32000d9c6137622ed74b19b8dd965',
          'token':'0x8509275bF7aAa781cf2946fB53e11568499899f1'}
};


async function main() {

  const [owner] = await hre.ethers.getSigners();

  const chainId = parseInt(await hre.network.provider.send("eth_chainId"));

  console.log(owner.address, chainId);

  const digits =  BigNumber.from(10).pow(BigNumber.from(18));

  const price1 = BigNumber.from(40)*digits;
  const tokenId1 = 1;

  const price2 = BigNumber.from(310)*digits;
  const tokenId2 = 2;


  const nftFactory = await hre.ethers.getContractFactory("LempiverseChildMintableERC1155");
  const minterFactory = await hre.ethers.getContractFactory("LempiverseNftEggMinter");
  const contract = await minterFactory.deploy();

  await contract.deployed();

  console.log("deployed to:", contract.address);

  let tx;
  let receipt;


  const mintLimit = 500;

  tx = await contract.functions.setup(cmap[chainId].paymentToken, cmap[chainId].token);
  reciept = await tx.wait();
  console.log(reciept.transactionHash);

  tx = await contract.functions.setupPosition(tokenId1, price1.toString(), mintLimit);
  reciept = await tx.wait();
  console.log("pos1", reciept.transactionHash);

  tx = await contract.functions.setupPosition(tokenId2, price2.toString(), mintLimit);
  reciept = await tx.wait();
  console.log("pos2", reciept.transactionHash);


  const rescuerRole = await contract.functions.RESCUER_ROLE();
  tx = await contract.functions.grantRole(rescuerRole.toString(), owner.address);
  reciept = await tx.wait();
  console.log(reciept.transactionHash);


  const nftContract = nftFactory.attach(cmap[chainId].token);
  const adminRole = await nftContract.DEFAULT_ADMIN_ROLE();
  tx = await nftContract.functions.grantRole(adminRole, contract.address);
  reciept = await tx.wait();
  console.log(reciept.transactionHash);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
