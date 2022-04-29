//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./interfaces/ILiquidator.sol";
import "./AgreementStorage.sol";
import "./PriceConsumer.sol";
import "./Swapper.sol";
import "@chainlink/contracts/src/v0.8/KeeperBase.sol";

/**
 * @title Liquidator
 * @author Team
 * @notice It defines the Liquidator contract
 **/

contract Liquidator is
    ILiquidator,
    KeeperBase,
    PriceConsumer,
    Swapper,
    AgreementStorage
{
    address public constant _swapRouter = 0xE592427A0AEce92De3Edee1F18E0157C05861564;
    constructor() Swapper(ISwapRouter(_swapRouter)){}

    function getUndercollateralizedAgreements()
        public
        view
        override
        returns (uint256[] memory)
    {}

    function liquidationCall(uint256 agreementId) private {}

    function checkUpkeep(
        bytes calldata /* checkData */
    )
        external
        view
        override
        returns (
            bool upkeepNeeded,
            bytes memory /* performData */
        )
    {}

    function performUpkeep(
        bytes calldata /* performData */
    ) external override {}
}
