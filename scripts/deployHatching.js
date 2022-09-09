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

  137: {'garbage':'0x10D6e7800079EA90c4bdA9a40aD63F0709bb16bE',
        'token':'0x08bbe53cd50B8F03296E59b7FD4AEA325546921a',
        'vrfCoordinator':'0xAE975071Be8F8eE67addBC1A82488F1C24858067',
        'keyHash':'0xcc294a196eeeb44da2888d17c0625cc88d70d9760a69d58d853ba6581a9ab0cd', //500Gwei
        'hatchingAddress':'0x48CB319ba2ea102739a8F7550628DC24Ea6bb99C',
        'subscriptionId':288},

  80001: {'garbage':'0x10D6e7800079EA90c4bdA9a40aD63F0709bb16bE',
          'token':'0x8509275bF7aAa781cf2946fB53e11568499899f1',
          'vrfCoordinator':'0x7a1BaC17Ccc5b313516C5E16fb24f7659aA5ebed',
          'keyHash':'0x4b09e658ed251bcafeebbc69400383d49f344ace09b9576fe248bb02c003fe9f',
          'hatchingAddress':'0x20fD86a2AD7ADF2726Ce60a72cbB3061c27cb36C',
          'subscriptionId':1577},
};

async function deployHatching(chainId) {
  if (cmap[chainId].vrfCoordinator == undefined)
    return;
  if (cmap[chainId].hatchingAddress != '0x0000000000000000000000000000000000000000')
    return;

  const garbage = cmap[chainId].garbage;

  const lempiverseHatchingFactory = await hre.ethers.getContractFactory("LempiverseHatching");
  const lempiverseHatching = await lempiverseHatchingFactory.deploy(
                                          cmap[chainId].vrfCoordinator,
                                          cmap[chainId].token,
                                          garbage);
  await lempiverseHatching.deployed();
  console.log("lempiverseHatching deployed to:", lempiverseHatching.address);

  cmap[chainId].hatchingAddress = lempiverseHatching.address;
}

async function setupHatching(chainId) {

  const lempiverseHatchingFactory = await hre.ethers.getContractFactory("LempiverseHatching");
  const nftFactory = await hre.ethers.getContractFactory("LempiverseChildMintableERC1155");

  const contract = lempiverseHatchingFactory.attach(cmap[chainId].hatchingAddress);

  const callbackGasLimit = 1000000;
  const requestConfirmations = 3;
  const tokenId = 1;

  let tx;
  let receipt;

  tx = await contract.functions.setupVRF(
                callbackGasLimit,
                requestConfirmations,
                cmap[chainId].keyHash,
                cmap[chainId].subscriptionId);

  reciept = await tx.wait();
  console.log(reciept.transactionHash);

  tx = await contract.functions.setupEggsBulkLimit(200);
  reciept = await tx.wait();
  console.log(reciept.transactionHash);




  const nftContract = nftFactory.attach(cmap[chainId].token);
  const adminRole = await nftContract.DEFAULT_ADMIN_ROLE();
  tx = await nftContract.grantRole(adminRole, cmap[chainId].hatchingAddress);
  reciept = await tx.wait();
  console.log(reciept.transactionHash);
}

async function setupDistribution(chainId) {

  const lempiverseHatchingFactory = await hre.ethers.getContractFactory("LempiverseHatching");
  const contract = lempiverseHatchingFactory.attach(cmap[chainId].hatchingAddress);

  const distribIds1 = [1000001,1000002,1000003,1000004,1000005,1000006,1000007,1000008,1000009,10000010,10000011,10000012,10000013,10000014,10000015];
  const distribWeights1 = [10,10,10,10,10,10,10,10,10,10,10,10,10,10,10];

  tx = await contract.setupDistribution(1, distribIds1, distribWeights1);
  reciept = await tx.wait();
  console.log(reciept.transactionHash);


  const distribIds2 = [1000016,1000017,1000018,1000019,1000020,1000021,1000022,1000023,1000024,1000025,1000026,1000027,1000028,1000029,1000030,1000031,1000032,1000033,1000034,1000035,1000036]
  const distribWeights2 = [766,766,766,766,766,766,766,766,766,500,500,500,500,500,500,16,16,16,16,16,16]

  tx = await contract.setupDistribution(2, distribIds2, distribWeights2);
  reciept = await tx.wait();
  console.log(reciept.transactionHash);
}


async function deployGarbage(chainId) {

  if (cmap[chainId].garbage != '0x0000000000000000000000000000000000000000') {
    return;
  }

  const garbageFactory = await hre.ethers.getContractFactory("Garbage");

  const [signer] = await hre.ethers.getSigners();

  const SALT = "0x0000000000000000000000000000000000000000000000000000000000000001";
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
  await setupHatching(chainId);
  await setupDistribution(chainId);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
