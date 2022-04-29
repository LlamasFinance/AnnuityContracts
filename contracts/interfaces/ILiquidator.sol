//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@chainlink/contracts/src/v0.8/interfaces/KeeperCompatibleInterface.sol";

/**
 * @title ILiquidator
 * @author Team
 * @notice Defines the basic interface for a Liquidator
 **/
interface ILiquidator is KeeperCompatibleInterface {
    event LiquidationCall(
        uint256 agreementId,
        uint256 liquidatedCollateralAmount
    );

    //function liquidationCall(uint256 agreementId) external;

    function getUndercollateralizedAgreements()
        external
        view
        returns (uint256[] memory);
}
