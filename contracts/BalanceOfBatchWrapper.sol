// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import {IERC1155} from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";

contract BalanceOfBatchWrapper {

    function balanceOfBatch(address token, address account, uint256[] calldata ids) external returns (uint256[] memory) {

        address[] memory accounts = new address[](ids.length);

        for (uint256 i=0; i<ids.length; i++) {
            accounts[i] = account;
        }

        return IERC1155(token).balanceOfBatch(accounts, ids);
    }
}
