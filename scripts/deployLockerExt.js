// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");


const cmap =
{

  137: {'token':'0x08bbe53cd50B8F03296E59b7FD4AEA325546921a',
        'oldLocker':'0xD79f030c2D1e6f23Cc7ec2C4b2C4cF6556156aA0',
        'unlocker':'0x987C483F51296156203a7696c939f7eeFf04A894'
      },

  80001: {'token':'0x8509275bF7aAa781cf2946fB53e11568499899f1',
          'oldLocker':'0x13a248433F41c998245d0EDB335D97694e507871',
          'unlocker':'0x44bd62ed763a6e3247c2266ecd56b6da56f7fa83'
          },

}

const GARBAGE = '0x10d6e7800079ea90c4bda9a40ad63f0709bb16be';

async function main() {

  const [owner] = await hre.ethers.getSigners();

  const chainId = parseInt(await hre.network.provider.send("eth_chainId"));


  if (cmap[chainId].token == undefined) {
    console.error("bad chainid");
    process.exit(-1);
  }

  console.log(owner.address, chainId, cmap[chainId].token);

  const nftERC1155Factory = await hre.ethers.getContractFactory("LempiverseChildMintableERC1155");
  const nftFactoryOld = await hre.ethers.getContractFactory("LempiverseGameLocker");
  const nftFactory = await hre.ethers.getContractFactory("LempiverseGameLockerEx");
  const contract = await nftFactory.deploy();
  await contract.deployed();

  // const contract = nftFactory.attach("0x13a248433F41c998245d0EDB335D97694e507871");


  console.log("deployed to:", contract.address);

  tx = await contract.functions.setup(cmap[chainId].token, GARBAGE, cmap[chainId].oldLocker);
  reciept = await tx.wait();
  console.log(reciept.transactionHash);

  const unlockRole = await contract.UNLOCKER_ROLE();
  tx = await contract.grantRole(unlockRole, cmap[chainId].unlocker);
  reciept = await tx.wait();
  console.log(reciept.transactionHash);

  const oldContract = nftFactoryOld.attach(cmap[chainId].oldLocker);
  const nftERC1155 = nftERC1155Factory.attach(cmap[chainId].token);

  tx = await oldContract.grantRole(unlockRole, contract.address);
  reciept = await tx.wait();
  console.log(reciept.transactionHash);


  const adminRole = await nftERC1155.DEFAULT_ADMIN_ROLE();
  tx = await nftERC1155.functions.grantRole(adminRole, contract.address);
  reciept = await tx.wait();
  console.log(reciept.transactionHash);


  tx = await contract.functions.start();
  reciept = await tx.wait();
  console.log(reciept.transactionHash);

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
