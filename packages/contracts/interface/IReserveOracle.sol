// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.6.0
pragma solidity ^0.8.27;

struct ReserveData {
    uint256 adjustedOffchainReserveUSD;
    bool reserveValid;
    uint256 updatedAt;
    bytes32 attestationHash;
}

interface IReserveOracle {
    event ReserveDataUpdated(
        uint256 adjustedOffchainReserveUSD,
        bool reserveValid,
        uint256 timestamp,
        bytes32 attestationHash
    );

    /**
     * @notice Returns the latest reserve report.
     */
    function getLatestReserveData()
        external
        view
        returns (ReserveData memory);

    /**
     * @notice Returns only the adjusted off-chain reserve value.
     */
    function getAdjustedOffchainReserveUSD()
        external
        view
        returns (uint256);

    /**
     * @notice Returns whether the latest reserve report is valid.
     */
    function isReserveValid()
        external
        view
        returns (bool);

    /**
     * @notice Returns the timestamp of the latest oracle update.
     */
    function lastUpdated()
        external
        view
        returns (uint256);
}