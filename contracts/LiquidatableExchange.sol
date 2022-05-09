// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "@chainlink/contracts/src/v0.8/KeeperCompatible.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "./Exchange.sol";
import "hardhat/console.sol";

error OnlyKeeperRegistry();

contract LiquidatableExchange is Pausable, KeeperCompatible, Exchange {
    address public s_keeperRegistryAddress;

    function getLiquidatableAgreements()
        public
        view
        returns (uint256[] memory)
    {
        uint256[] memory ids = new uint256[](s_numIDs);
        uint256 count = 0;
        bool needsLiquidation;
        for (uint256 id = 1; id <= s_numIDs; ++id) {
            needsLiquidation = isLiquidationRequired(id);
            if (needsLiquidation) {
                ids[id - 1] = id;
                count++;
            }
        }

        if (count != s_numIDs) {
            assembly {
                mstore(ids, count)
            }
        }

        return ids;
    }

    function isLiquidationRequired(uint256 id) public view returns (bool) {
        Agreement memory agreement = s_idToAgreement[id];
        uint256 start = agreement.start;
        uint256 duration = agreement.duration;
        uint256 secPerYear = 31536000;
        uint256 repaidAmt = agreement.repaidAmt;
        uint256 futureValue = agreement.futureValue;
        uint256 minReqCollateral = getMinReqCollateral(id);
        uint256 actualCollateral = agreement.collateral;

        if (actualCollateral <= minReqCollateral) {
            return true;
        } else if (
            block.timestamp - start > secPerYear && repaidAmt < futureValue
        ) {
            return true;
        } else {
            return false;
        }
    }

    function liquidate(uint256[] memory idsToLiquidate) public whenNotPaused {
        Agreement storage agreement;
        for (uint256 idx = 0; idx < idsToLiquidate.length; ++idx) {
            uint256 id = idsToLiquidate[idx];
            agreement = s_idToAgreement[id];
            bool needsLiquidation = isLiquidationRequired(id);
            if (needsLiquidation) {
                // call uniswap ... etc
                // TODO
            }
        }
    }

    function checkUpkeep(bytes calldata)
        external
        view
        override
        whenNotPaused
        returns (bool upkeepNeeded, bytes memory performData)
    {
        uint256[] memory idsToLiquidate = getLiquidatableAgreements();
        upkeepNeeded = idsToLiquidate.length > 0;
        performData = abi.encode(idsToLiquidate);
        return (upkeepNeeded, performData);
    }

    function performUpkeep(bytes calldata performData)
        external
        override
        onlyKeeperRegistry
        whenNotPaused
    {
        uint256[] memory idsToLiquidate = abi.decode(performData, (uint256[]));
        liquidate(idsToLiquidate);
    }

    /********************/
    /* Modifiers */
    /********************/
    modifier onlyKeeperRegistry() {
        if (msg.sender != s_keeperRegistryAddress) {
            revert OnlyKeeperRegistry();
        }
        _;
    }

    /********************/
    /* DAO / OnlyOwner Functions */
    /********************/
    function setKeeperRegistryAddress(address keeperRegistryAddress)
        external
        onlyOwner
    {
        require(keeperRegistryAddress != address(0));
        s_keeperRegistryAddress = keeperRegistryAddress;
    }
}
