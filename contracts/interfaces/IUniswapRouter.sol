// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

pragma abicoder v2;
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "@uniswap/v3-periphery/contracts/interfaces/IPeripheryPayments.sol";

interface IUniswapRouter is ISwapRouter, IPeripheryPayments {
    //function refundETH() external payable;
}
