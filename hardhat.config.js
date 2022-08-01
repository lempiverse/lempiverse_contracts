require('dotenv').config();
const PRIVATE_KEY = process.env.PRIVATE_KEY;

require("@nomiclabs/hardhat-truffle5");
require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {

  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
    },
    mumbai: {
      gasLimit: 60000000000,
      url: "https://rpc-mumbai.maticvigil.com",
      accounts: [PRIVATE_KEY]
    },
    matic: {
      gasLimit: 60000000000,
      url: "https://rpc-mainnet.maticvigil.com",
      accounts: [PRIVATE_KEY]
    },
    goerli: {
      gasPrice: 1000000000,
      gasLimit: 60000000000,
      url: "https://goerli.prylabs.net",
      accounts: [PRIVATE_KEY]
    }
  },
  solidity: {
    version: "0.8.9",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  mocha: {
    timeout: 20000
  }

};
