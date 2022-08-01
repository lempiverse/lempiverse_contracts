// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");


const childChainManagers = {
  137:'0xA6FA4fB5f76172d178d61B04b0ecd319C5d1C0aa',   //matic
  80001:'0xb5505a6d998549090530911180f38aC5130101c6'  //mumbai
};

async function main() {

  const [owner] = await hre.ethers.getSigners();

  const chainId = parseInt(await hre.network.provider.send("eth_chainId"));

  console.log(owner.address, chainId, childChainManagers[chainId]);

  if (childChainManagers[chainId] == undefined) {
    console.error("bad chainid");
    process.exit(-1);
  }


  const nftFactory = await hre.ethers.getContractFactory("LempiverseChildMintableERC1155");
  const contract = await nftFactory.deploy(childChainManagers[chainId]);

  await contract.deployed();


  console.log("deployed to:", contract.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
