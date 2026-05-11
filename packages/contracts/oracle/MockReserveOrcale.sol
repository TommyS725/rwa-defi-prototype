// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IReserveOracle, ReserveData} from "./../interface/IReserveOracle.sol";

contract MockReserveOracle is Ownable, IReserveOracle {
    ReserveData private reserveData;

 
    constructor(address _owner) Ownable(_owner) {}

    function setReserveData(
        uint256 _adjustedOffchainReserveUSD,
        bool _reserveValid,
        uint256 _updatedAt,
        bytes32 _attestationHash
    ) external onlyOwner {
        reserveData = ReserveData({
            adjustedOffchainReserveUSD: _adjustedOffchainReserveUSD,
            reserveValid: _reserveValid,
            updatedAt: _updatedAt,
            attestationHash: _attestationHash
        });
        emit ReserveDataUpdated(_adjustedOffchainReserveUSD, _reserveValid, _updatedAt,_attestationHash);
    }

    /**
     * @notice Returns the latest reserve report.
     */
    function getLatestReserveData()
        external
        view
        returns (ReserveData memory){
            return reserveData;
        }

    /**
     * @notice Returns only the adjusted off-chain reserve value.
     */
    function getAdjustedOffchainReserveUSD()
        external
        view
        returns (uint256){
            return reserveData.adjustedOffchainReserveUSD;
    }


    /**
     * @notice Returns whether the latest reserve report is valid.
     */
    function isReserveValid()
        external
        view
        returns (bool){
            return reserveData.reserveValid;
        }


    /**
     * @notice Returns the timestamp of the latest oracle update.
     */
    function lastUpdated()
        external
        view
        returns (uint256){
            return reserveData.updatedAt;
        }

}