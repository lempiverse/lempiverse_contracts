// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");



const mintableERC1155PredicateProxies = {
  1:'0x2d641867411650cd05dB93B59964536b1ED5b1B7',   //mainnet
  5:'0x72d6066F486bd0052eefB9114B66ae40e0A6031a'  //goerli
};


async function main() {

  const [owner] = await hre.ethers.getSigners();

  const chainId = parseInt(await hre.network.provider.send("eth_chainId"));
  console.log(owner.address, chainId);



  if (mintableERC1155PredicateProxies[chainId] == undefined) {
    console.error("bad chainid");
    process.exit(-1);
  }



  const nftFactory = await hre.ethers.getContractFactory("LempiverseRootMintableERC1155");
  const contract = await nftFactory.deploy(mintableERC1155PredicateProxies[chainId]);

  await contract.deployed();


  console.log("deployed to:", contract.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
