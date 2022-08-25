// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");


const cmap =
{
  1: {'garbage':'0x0000000000000000000000000000000000000000'},
  5: {'garbage':'0x0000000000000000000000000000000000000000'},

  137: {'garbage':'0x0000000000000000000000000000000000000000',
        'token':'0x08bbe53cd50B8F03296E59b7FD4AEA325546921a',
        'vrfCoordinator':'0xAE975071Be8F8eE67addBC1A82488F1C24858067'},

  80001: {'garbage':'0x0dc671ffb45093c30049c298da93f2056eaf87c6',
          'token':'0x8509275bF7aAa781cf2946fB53e11568499899f1',
          'vrfCoordinator':'0x7a1BaC17Ccc5b313516C5E16fb24f7659aA5ebed'}
};

async function deployHatching(chainId) {
  if (cmap[chainId].vrfCoordinator == undefined)
    return;

  const garbage = cmap[chainId].garbage;


  const lempiverseHatchingFactory = await hre.ethers.getContractFactory("LempiverseHatching");
  const lempiverseHatching = await lempiverseHatchingFactory.deploy(
                                          cmap[chainId].vrfCoordinator,
                                          cmap[chainId].token,
                                          garbage);
  await lempiverseHatching.deployed();
  console.log("lempiverseHatching deployed to:", lempiverseHatching.address);


  await lempiverseHatching.functions.setup(cmap[chainId].paymentToken, cmap[chainId].token, price, tokenId, mintLimit);
}


async function deployGarbage(chainId) {

  if (cmap[chainId].garbage != '0x0000000000000000000000000000000000000000') {
    return;
  }

  const garbageFactory = await hre.ethers.getContractFactory("Garbage");

  const [signer] = await hre.ethers.getSigners();

  const SALT = "0x0000000000000000000000000000000000000000000000000000000000000000";
  const DEPLOYER = "0x4e59b44847b379578588920ca78fbf26c0b4956c";
  const data = SALT+garbageFactory.bytecode.toString().slice(2);

  const from = await signer.getAddress()

  const codeHash = ethers.utils.keccak256(garbageFactory.bytecode);

  const address = ethers.utils.getCreate2Address(DEPLOYER, SALT, codeHash);
  console.log("address", address);


  const tx = {
      from: from,
      to: DEPLOYER,
      data: data,
      gasLimit: ethers.utils.hexlify(1000000),
  };
  const txid = await signer.sendTransaction(tx);
  const reciept = await txid.wait();
  console.log(reciept);

  console.log("garbage deployed to:", address);
  cmap[chainId].garbage = address
}


async function main() {

  const [owner] = await hre.ethers.getSigners();

  const chainId = parseInt(await hre.network.provider.send("eth_chainId"));

  console.log(owner.address, chainId);

  await deployGarbage(chainId);
  await deployHatching(chainId);

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
