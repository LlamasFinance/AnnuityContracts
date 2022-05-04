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

contract Liquidator is ILiquidator, KeeperBase, PriceConsumer, Swapper {
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
            if (!_isEnoughCollateral(id, collateralAmt)) {
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
        /*require(
            _isEnoughCollateral(agreementId, collateralAmt),
            "Not enough collateral"
        );*/
        _;
    }

    function _isEnoughCollateral(uint256 agreementId, uint256 collateralAmt)
        internal
        view
        virtual
        returns (bool)
    {
        // uint256 ethUsd = PriceConsumer.getLatestPrice();
        // uint256 depositAmt = agreements[agreementId].deposit;
        // uint256 collateralValue = ethUsd / collateralAmt;
        // isEnough = (collateralValue > depositAmt * REQUIRED_RATIO);

        bool isEnough = false;
        // get price of ETH in USDC using chainlink price feed

        uint256 price = PriceConsumer.getLatestPrice();

        //totalPrice is elevated by 26 (18:-eth-> wei && 8:- price return by pricefeed is already elevated) 18+8=26
        uint256 totalPrice = price * collateralAmt;

        //agreements[id].deposit is already elevated by 6(USDC ERC20 contract has 6 decimal) so we multiply it by 1e20 to elevate it by 26 and then compare it with totalPrice
        uint256 _depositUSDC = agreements[agreementId].deposit * 1e20;

        if (totalPrice > ((3 * _depositUSDC) / 2)) {
            isEnough = true;
        } else {
            isEnough = false;
        }
        return isEnough;
    }
}
