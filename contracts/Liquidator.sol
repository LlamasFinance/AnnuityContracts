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
    uint256 public constant REQUIRED_RATIO = 15;

    function getUndercollateralizedAgreements()
        public
        view
        override
        returns (uint256[] memory needsLiquidation)
    {
        uint256 count = 0;
        needsLiquidation = new uint256[](numAgreements);
        uint256 collateralAmt;
        for (uint256 id = 0; id < numAgreements; ++id) {
            collateralAmt = agreements[id].collateral;
            if (!isEnoughCollateral(id, collateralAmt)) {
                needsLiquidation[count] = id;
                count++;
            }
        }
        if (count != numAgreements) {
            assembly {
                mstore(needsLiquidation, count)
            }
        }
    }

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

    modifier onlyIfEnoughCollateral(
        uint256 agreementId,
        uint256 collateralAmt
    ) {
        require(
            isEnoughCollateral(agreementId, collateralAmt),
            "Not enough collateral"
        );
        _;
    }

    function isEnoughCollateral(uint256 agreementId, uint256 collateralAmt)
        internal
        view
        virtual
        returns (bool isEnough)
    {
        uint256 ethUsd = PriceConsumer.getLatestPrice();
        uint256 depositAmt = agreements[agreementId].deposit;
        uint256 collateralValue = ethUsd / collateralAmt;
        isEnough = (collateralValue > depositAmt * REQUIRED_RATIO);
    }
}
