// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "hardhat/console.sol";

contract PriceConsumer {
    AggregatorV3Interface internal priceFeed;

    // address internal priceFeedAddr = 0x8A753747A1Fa494EC906cE90E9f37563A8AF630e;

    /**
     * Network: Kovan
     * Aggregator: ETH/USD
     * Address: 0x9326BFA02ADD2366b30bacB125260Af641031331
     */
    constructor(address _a) {
        priceFeed = AggregatorV3Interface(_a);
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

        ) = priceFeed.latestRoundData();
        latestPrice = uint256(price);
    }
}
