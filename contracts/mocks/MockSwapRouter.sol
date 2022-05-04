//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol";
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol";

abstract contract MockSwapRouter is ISwapRouter {
    function exactInputSingle(ExactInputSingleParams calldata params)
        external
        payable
        override
        returns (uint256 amountOut)
    {
        // assuming $3000 usdc / eth
        // assuming params.tokenIn is usdc
        uint256 liquidatedEthValue = params.amountIn * (10**12) * 3000;
        TransferHelper.safeTransferFrom(
            params.tokenIn,
            msg.sender,
            params.recipient,
            liquidatedEthValue
        );
        amountOut = liquidatedEthValue;
    }
}
