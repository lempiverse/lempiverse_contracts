// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");


const chains = {
  137:'0x08bbe53cd50B8F03296E59b7FD4AEA325546921a',   //matic
  80001:'0x8509275bF7aAa781cf2946fB53e11568499899f1'  //mumbai
};

async function main() {

  const [owner] = await hre.ethers.getSigners();

  const chainId = parseInt(await hre.network.provider.send("eth_chainId"));

  console.log(owner.address, chainId, chains[chainId]);

  if (chains[chainId] == undefined) {
    console.error("bad chainid");
    process.exit(-1);
  }


  const nftFactory = await hre.ethers.getContractFactory("LempiCoin");
  const contract = await nftFactory.deploy();

  await contract.deployed();


  console.log("deployed to:", contract.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
