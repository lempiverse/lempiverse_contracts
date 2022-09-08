const hre = require("hardhat");

async function main() {

  const TOKEN_ID = 1;

  const [owner] = await hre.ethers.getSigners();

  const chainId = parseInt(await hre.network.provider.send("eth_chainId"));
  console.log(owner.address, chainId);

  const cmap =
  {
    1: {'name':'LempiverseRootMintableERC1155',
        'address':'0xC6CEF0Fcd9aDE5B60c25b14E46A47Bd48D4C397F',
        'metataddress':''},

    5: {'name':'LempiverseRootMintableERC1155',
        'address':'0xF0917Fc37516d772d2B5070203BD43e05624A7c9',
        'metataddress':''},

    137: {'name':'LempiverseChildMintableERC1155',
          'address':'0x08bbe53cd50B8F03296E59b7FD4AEA325546921a',
          'metataddress':'0x207Fa8Df3a17D96Ca7EA4f2893fcdCb78a304101',
          'minter':'0x0000000000000000000000000000000000000000'},

    80001: {'name':'LempiverseChildMintableERC1155',
            'address':'0x8509275bF7aAa781cf2946fB53e11568499899f1',
            'metataddress':'0x53d791f18155C211FF8b58671d0f7E9b50E596ad',
            'minter':'0xF1e40835f138609f64af2D5f9B81e7b48961b2eb'},
  };

  console.log(cmap[chainId].name, cmap[chainId].address);

  const nftFactory = await hre.ethers.getContractFactory(cmap[chainId].name);
  const contract = nftFactory.attach(cmap[chainId].address);

  if (cmap[chainId].address == "") {
    console.error("unconfigured chainid");
    process.exit(-1);
  }

  var tx, r;

  async function reg(id, url) {
    console.log(id, url);
    tx = await contract.functions.setURI(id, url);
    console.log(tx['hash']);
    // r = await tx.wait();
    // console.log(r);
  }


  for (var i = 1; i<=36; i++) {
    const url = "bafybeiek5ro3dermteisq33ahw6rpw6g32othzlgijhfhdjhzmitdceqdm/"+i+".json";
    const urlb = "bafybeiek5ro3dermteisq33ahw6rpw6g32othzlgijhfhdjhzmitdceqdm/"+i+"b.json";

    await reg(1000000+i, url)
    await reg(2000000+i, urlb)
  }


}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
