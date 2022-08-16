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
            'minter':'0x82047b8eA7d1620Fe47FAA28aea718bD00b70231'},
  };

  console.log(cmap[chainId].name, cmap[chainId].address);

  const nftFactory = await hre.ethers.getContractFactory(cmap[chainId].name);
  const contract = nftFactory.attach(cmap[chainId].address);

  if (cmap[chainId].address == "") {
    console.error("unconfigured chainid");
    process.exit(-1);
  }

  const minterFactory = await hre.ethers.getContractFactory("LempiverseNftEggMinter");
  const minterContract = minterFactory.attach(cmap[chainId].minter);


  var tx, r;

  const data = hre.ethers.utils.arrayify("0x00");


  tx = await contract.functions.grantRole("0x0000000000000000000000000000000000000000000000000000000000000000", cmap[chainId].minter);
  console.log(tx['hash']);
  r = await tx.wait();
  console.log(r);

  tx = await minterContract.functions.startSale();
  console.log(tx['hash']);
  r = await tx.wait();
  console.log(r)


  // if (cmap[chainId].metataddress != "") {
  //   tx = await contract.functions.setupMetaTransactionOperator(cmap[chainId].metataddress);
  //   console.log(tx['hash']);
  //   r = await tx.wait();
  //   console.log(r);
  // }


  // tx = await contract.functions.mint(owner.address, TOKEN_ID, 200, data);
  // console.log(tx['hash']);
  // r = await tx.wait();
  // console.log(r);

  // tx = await contract.functions.safeTransferFrom(owner.address, "0x987C483F51296156203a7696c939f7eeFf04A894", TOKEN_ID, 200, data);
  // console.log(tx['hash']);
  // r = await tx.wait();
  // console.log(r);


  // tx = await contract.functions.setBaseURI("https://cloudflare-ipfs.com/ipfs/");
  // console.log(tx['hash']);
  // r = await tx.wait();
  // console.log(r);

  // tx = await contract.functions.setURI(TOKEN_ID, "bafkreig6dpfqrv3p4klu63qhpa5lgf443k6fqmcw6xjhrc2worep7anbce");
  // console.log(tx['hash']);
  // r = await tx.wait();
  // console.log(r);

  // tx = await contract.functions.setDefaultRoyalty(owner.address, 500);
  // console.log(tx['hash']);
  // r = await tx.wait();
  // console.log(r);


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
