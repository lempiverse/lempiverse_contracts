// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;


abstract contract FlatEggsArray
{
    struct Egg {
        address from;
        uint256 id;
        uint256 value;
    }

    Egg [] public toHatchList;
    uint256 public eggsCounter;
    uint256 public eggsBulkLimit;

    uint256 public addIndex;
    uint256 public hatchIndex;
    uint256 public topIndex;

    constructor() {
    }

    function _hatchEgg(address from, uint256 id, uint256 rnd) internal virtual;

    function _startHatch(uint256[] memory rnds) internal {

        uint256 rndIdx = 0;
        uint256 i;
        for (i = hatchIndex; i < topIndex; i++) {

            Egg memory egg = toHatchList[i];

            if (egg.value > rnds.length - rndIdx) {
                break;
            }

            for (uint256 j = 0; j < egg.value; j++) {
                _hatchEgg(egg.from, egg.id, rnds[ rndIdx++ ]);
            }
        }

        if (addIndex > i && i > eggsBulkLimit) {
            //if there are enought space at begins of array and
            //currently we are adding from end of array
            //so let's start adding at begins of array
            addIndex = 0;
        }

        if (i == topIndex) {

            hatchIndex = 0;
            topIndex = 0;

        } else {
            hatchIndex = i;
        }

    }

    function _addEgg(
        address from,
        uint256 id,
        uint256 value) internal {

        require(value < eggsBulkLimit/2, "too big value to transfer");

        if (addIndex >= toHatchList.length) {
            toHatchList.push(Egg(from, id, value));
            addIndex++;
        } else {
            toHatchList[addIndex++] = Egg(from, id, value);
        }

        if (addIndex > hatchIndex) {
            topIndex = addIndex;
        }

        eggsCounter += value;
    }

}

contract FlatEggsArrayTest is FlatEggsArray
{
    function _hatchEgg(address from, uint256 id, uint256 rnd) internal override {
        //TODO
    }


    function testStartHatch(uint256[] memory rnds) external {
        _startHatch(rnds);
    }


    function testResetEggsCounter() external {
        eggsCounter = 0;
    }


    function testAddEggs(
        address from,
        uint256 id,
        uint256 value,
        bytes calldata /*data*/
    ) external
    {
        _addEgg(from, id, value);
    }
}

