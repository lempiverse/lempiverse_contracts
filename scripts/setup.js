const hre = require("hardhat");

async function main() {

  const TOKEN_ID = 1;

  const [owner] = await hre.ethers.getSigners();

  const chainId = parseInt(await hre.network.provider.send("eth_chainId"));
  console.log(owner.address, chainId);

  const cmap =
  {
    1: {'name':'LempiverseRootMintableERC1155',
        'address':'',
        'metataddress':''},

    5: {'name':'LempiverseRootMintableERC1155',
        'address':'0xF0917Fc37516d772d2B5070203BD43e05624A7c9',
        'metataddress':''},

    137: {'name':'LempiverseChildMintableERC1155',
          'address':'',
          'metataddress':'0x207Fa8Df3a17D96Ca7EA4f2893fcdCb78a304101'},

    80001: {'name':'LempiverseChildMintableERC1155',
            'address':'0x8509275bF7aAa781cf2946fB53e11568499899f1',
            'metataddress':'0x53d791f18155C211FF8b58671d0f7E9b50E596ad'}
  };

  console.log(cmap[chainId].name, cmap[chainId].address);

  const nftFactory = await hre.ethers.getContractFactory(cmap[chainId].name);
  const contract = nftFactory.attach(cmap[chainId].address);

  if (cmap[chainId].address == "") {
    console.error("unconfigured chainid");
    process.exit(-1);
  }


  var tx, r;

  const data = hre.ethers.utils.arrayify("0x00");

  if (cmap[chainId].metataddress != "") {
    tx = await contract.functions.setupMetaTransactionOperator(cmap[chainId].metataddress);
    console.log(tx['hash']);
    r = await tx.wait();
    console.log(r);
  }


  tx = await contract.functions.mint(owner.address, TOKEN_ID, 1, data);
  console.log(tx['hash']);
  r = await tx.wait();
  console.log(r);

  tx = await contract.functions.setBaseURI("https://cloudflare-ipfs.com/ipfs/");
  console.log(tx['hash']);
  r = await tx.wait();
  console.log(r);

  tx = await contract.functions.setURI(TOKEN_ID, "bafkreigehevahojbpmchkbeuhaacczg7mf32nqjlwj6d3pa7iuxhmtltpe");
  console.log(tx['hash']);
  r = await tx.wait();
  console.log(r);

  tx = await contract.functions.setDefaultRoyalty(owner.address, 100);
  console.log(tx['hash']);
  r = await tx.wait();
  console.log(r);


  const uri = await contract.callStatic.uri(TOKEN_ID);
  const bal = await contract.callStatic.balanceOf(owner.address, TOKEN_ID);
  const royalty = await contract.callStatic.royaltyInfo(TOKEN_ID, 1000);
  console.error(bal.toString(), royalty.toString(), uri);

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
