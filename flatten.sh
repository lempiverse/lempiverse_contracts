#!/usr/bin/env bash


doit() {
	npx hardhat flatten contracts/$1 >  flatten/$1
	sed -i '/SPDX-License-Identifier/d' flatten/$1
	sed -i '1i\// SPDX-License-Identifier: MIT' flatten/$1
}

doit "LempiverseGameLockerEx.sol"
doit "LempiverseChildMintableERC1155.sol"
doit "LempiverseRootMintableERC1155.sol"
doit "LempiverseNftMinter.sol"
doit "LempiverseHatching.sol"
doit "Garbage.sol"
doit "BalanceOfBatchWrapper.sol"
doit "LempiverseGameLocker.sol"
doit "LempiCoin.sol"

