// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "hardhat/console.sol";

contract PriceConsumer {
    AggregatorV3Interface internal priceFeed;

    /**
     * Network: Kovan
     * Aggregator: ETH/USD
     * Address: 0x9326BFA02ADD2366b30bacB125260Af641031331
     */
    constructor() {
        /*priceFeed = AggregatorV3Interface(
            0x9326BFA02ADD2366b30bacB125260Af641031331
        );*/
    }

    /**
     * Returns the latest price
     */
    function getLatestPrice() public view returns (uint256 latestPrice) {
        (
            ,
            /*uint80 roundID*/
            int256 price, /*uint startedAt*/ /*uint timeStamp*/ /*uint80 answeredInRound*/
            ,
            ,

        ) = (0, 3, 1, 2, 3); /*priceFeed.latestRoundData()*/
        latestPrice = uint256(price);
        
    }
}