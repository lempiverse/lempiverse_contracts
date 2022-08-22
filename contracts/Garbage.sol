// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;


import {IERC1155Receiver, ERC1155Receiver} from "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Receiver.sol";
import {IERC1155} from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

interface Burnable is IERC1155 {
    function withdrawBatch(uint256[] calldata ids, uint256[] calldata amounts) external;
}


contract Garbage is ERC1155Receiver, Ownable
{
    constructor() {
    }

    uint256 public allowRecieveMode = 0;

    function setup(bool _allowRecieveMode) onlyOwner public {
        require(allowRecieveMode == 0, "only once allowed");
        allowRecieveMode = _allowRecieveMode ? 1 : 2;
    }

    function burn(Burnable ierc1155, uint256[] calldata ids) external {
        uint256[] memory amounts = new uint256[](ids.length);
        for (uint256 i = 0; i < ids.length; i++) {
            amounts[i] = ierc1155.balanceOf(address(this), ids[i]);
        }
        ierc1155.withdrawBatch(ids, amounts);
    }

   function onERC1155Received(
        address /*operator*/,
        address /*from*/,
        uint256 /*id*/,
        uint256 /*value*/,
        bytes calldata /*data*/
    ) external override view returns (bytes4)
    {
        return (allowRecieveMode == 1 ? IERC1155Receiver.onERC1155Received.selector : bytes4(0xbad00bad));
    }

   function onERC1155BatchReceived(
        address /*operator*/,
        address /*from*/,
        uint256[] calldata /*ids*/,
        uint256[] calldata /*values*/,
        bytes calldata /*data*/
    ) external override view returns (bytes4)
    {
        return (allowRecieveMode == 1 ? IERC1155Receiver.onERC1155BatchReceived.selector : bytes4(0xbad00bad));
    }
}
