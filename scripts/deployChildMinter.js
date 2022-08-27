// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");


const cmap =
{
  137: {'paymentToken':'0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
        'token':'0x08bbe53cd50B8F03296E59b7FD4AEA325546921a'},

  80001: {'paymentToken':'0x8f7116ca03aeb48547d0e2edd3faa73bfb232538',
          'token':'0x8509275bF7aAa781cf2946fB53e11568499899f1'}
};


async function main() {

  const [owner] = await hre.ethers.getSigners();

  const chainId = parseInt(await hre.network.provider.send("eth_chainId"));

  console.log(owner.address, chainId);

  const nftFactory = await hre.ethers.getContractFactory("LempiverseChildMintableERC1155");
  const minterFactory = await hre.ethers.getContractFactory("LempiverseNftEggMinter");
  const contract = await minterFactory.deploy();

  await contract.deployed();

  console.log("deployed to:", contract.address);

  let tx;
  let receipt;

  const price = 62*1e6;
  const tokenId = 2;
  const mintLimit = 500;

  tx = await contract.functions.setup(cmap[chainId].paymentToken, cmap[chainId].token);
  reciept = await tx.wait();
  console.log(reciept.transactionHash);

  tx = await contract.functions.setupPosition(tokenId, price, mintLimit);
  reciept = await tx.wait();
  console.log(reciept.transactionHash);


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
