// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");


const cmap =
{
  137: {'garbage':'0x0000000000000000000000000000000000000000',
        'token':'0x08bbe53cd50B8F03296E59b7FD4AEA325546921a',
        'vrfCoordinator':'0xAE975071Be8F8eE67addBC1A82488F1C24858067'},

  80001: {'garbage':'0x7f81bbdceD112904d3DfCd886a586F2f94429c0F',
          'token':'0x8509275bF7aAa781cf2946fB53e11568499899f1',
          'vrfCoordinator':'0x7a1BaC17Ccc5b313516C5E16fb24f7659aA5ebed'}
};


async function main() {

  const [owner] = await hre.ethers.getSigners();

  const chainId = parseInt(await hre.network.provider.send("eth_chainId"));

  console.log(owner.address, chainId);

  let garbage;

  if (cmap[chainId].garbage != '0x0000000000000000000000000000000000000000') {
    garbage = cmap[chainId].garbage;
  } else {
    const garbageFactory = await hre.ethers.getContractFactory("Garbage");
    garbage = await garbageFactory.deploy();
    await garbage.deployed();
    console.log("garbage deployed to:", garbage.address);
    garbage = garbage.address
  }

  const lempiverseHatchingFactory = await hre.ethers.getContractFactory("LempiverseHatching");
  const lempiverseHatching = await lempiverseHatchingFactory.deploy(
                                          cmap[chainId].vrfCoordinator,
                                          cmap[chainId].token,
                                          garbage);
  await lempiverseHatching.deployed();
  console.log("lempiverseHatching deployed to:", lempiverseHatching.address);


  // await contract.functions.setup(cmap[chainId].paymentToken, cmap[chainId].token, price, tokenId, mintLimit);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
