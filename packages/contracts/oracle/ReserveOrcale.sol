// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {FunctionsClient} from "@chainlink/contracts@1.5.0/src/v0.8/functions/v1_0_0/FunctionsClient.sol";
import {FunctionsRequest} from "@chainlink/contracts@1.5.0/src/v0.8/functions/v1_0_0/libraries/FunctionsRequest.sol";
import {IReserveOracle, ReserveData} from "./../interface/IReserveOracle.sol";

contract ReserveOracle is FunctionsClient, Ownable, IReserveOracle {
    using FunctionsRequest for FunctionsRequest.Request;

    ReserveData private latestReserveData;

    uint64 public subscriptionId;
    bytes32 public donId;

    string public source;
    string public apiUrl;

    uint32 public gasLimit = 300_000;
    uint256 public coolDown = 10 minutes;

    uint256 public minUpdateInterval;
    uint256 public lastRequestTimestamp;
    bytes32 public lastRequestId;
    bytes public lastResponse;
    bytes public lastError;

    mapping(address => uint256) private lastRequestTime;

    error UnexpectedRequestID(bytes32 requestId);
    error CoolDownActive(uint256 timeRemaining);

    event Response(bytes32 indexed requestId, bytes response, bytes err);
    event OracleConfigUpdated(
        uint64 indexed subscriptionId,
        bytes32 indexed donId,
        uint32 gasLimit,
        uint256 coolDown,
        string apiUrl
    );
    /**
     *
     * @param _owner Owner of the contract
     * @param _subscriptionId subscriptionId Billing ID
     * @param _router  Address of the Functions Router contract
     * @param _donId  ID of DON
     * @param _source JavaScript source code
     * @param _apiUrl  API URL to fetch reserve data from
     */
    constructor(
        address _owner,
        uint64 _subscriptionId,
        address _router,
        bytes32 _donId,
        string memory _source,
        string memory _apiUrl
    ) Ownable(_owner) FunctionsClient(_router) {
        require(_subscriptionId != 0, "bad subscriptionId");
        require(_router != address(0), "bad router");
        require(_donId != bytes32(0), "bad donId");
        require(bytes(_apiUrl).length > 0, "empty apiUrl");
        require(bytes(_source).length > 0, "empty source");
        subscriptionId = _subscriptionId;
        donId = _donId;
        source = _source;
        apiUrl = _apiUrl;
        emit OracleConfigUpdated(
            subscriptionId,
            donId,
            gasLimit,
            coolDown,
            apiUrl
        );
    }

    // =============================================================
    //                  CHAINLINK FUNCTION INTG
    // =============================================================

    /**
     * @notice Send a simple request
     */
    function requestReserveUpdate() external returns (bytes32 requestId) {
        //only allow one request per coolDown period per address, but owner can bypass coolDown
        if (msg.sender != owner()) {
            uint256 availableAt = lastRequestTime[msg.sender] + coolDown;
            if (block.timestamp < availableAt) {
                revert CoolDownActive(availableAt - block.timestamp);
            }
        }
        lastRequestTime[msg.sender] = block.timestamp;
        string[] memory args = new string[](1);
        args[0] = apiUrl;
        FunctionsRequest.Request memory req;
        req.initializeRequestForInlineJavaScript(source);
        req.setArgs(args);
        lastRequestId = _sendRequest(
            req.encodeCBOR(),
            subscriptionId,
            gasLimit,
            donId
        );
        return lastRequestId;
    }

    /**
     * @dev Internal function to process the outcome of a data request. It stores the latest response or error and updates
     * the contract state accordingly. This function is designed to handle only one of `response` or `err` at a time, not
     * both. It decodes the response if present and emits events to log both raw and decoded data.
     *
     * @param requestId The unique identifier of the request, originally returned by `sendRequest`. Used to match
     * responses with requests.
     * @param response The raw aggregated response data from the external source. This data is ABI-encoded and is expected
     * to contain specific information (e.g., answer, updatedAt) if no error occurred. The function attempts to decode
     * this data if `response` is not empty.
     * @param err The raw aggregated error information, indicating an issue either from the user's code or within the
     * execution of the user Chainlink Function.
     *
     * Emits a `DecodedResponse` event if the `response` is successfully decoded, providing detailed information about the
     * data received.
     * Emits a `Response` event for every call to log the raw response and error data.
     *
     * Requirements:
     * - The `requestId` must match the last stored request ID to ensure the response corresponds to the latest request
     * sent.
     * - Only one of `response` or `err` should contain data for a given call; the other should be empty.
     */
    function fulfillRequest(
        bytes32 requestId,
        bytes memory response,
        bytes memory err
    ) internal override {
        if (lastRequestId != requestId) {
            revert UnexpectedRequestID(requestId);
        }

        lastError = err;
        lastResponse = response;

        if (response.length > 0) {
            (
                uint256 _adjustedOffchainReserveUSD,
                bool _reserveValid,
                uint256 _updatedAt,
                bytes32 _attestationHash
            ) = abi.decode(response, (uint256, bool, uint256, bytes32));

            latestReserveData = ReserveData({
                adjustedOffchainReserveUSD: _adjustedOffchainReserveUSD,
                reserveValid: _reserveValid,
                updatedAt: _updatedAt,
                attestationHash: _attestationHash
            });
            emit ReserveDataUpdated(
                requestId,
                _adjustedOffchainReserveUSD,
                _reserveValid,
                _updatedAt,
                _attestationHash
            );
        }

        emit Response(requestId, response, err);
    }

    // =============================================================
    //                         GETTERS
    // =============================================================

    /**
     * @notice Returns the latest reserve report.
     */
    function getLatestReserveData() external view returns (ReserveData memory) {
        return latestReserveData;
    }

    /**
     * @notice Returns only the adjusted off-chain reserve value.
     */
    function getAdjustedOffchainReserveUSD() external view returns (uint256) {
        return latestReserveData.adjustedOffchainReserveUSD;
    }

    /**
     * @notice Returns whether the latest reserve report is valid.
     */
    function isReserveValid() external view returns (bool) {
        return latestReserveData.reserveValid;
    }

    /**
     * @notice Returns the timestamp of the latest oracle update.
     */
    function lastUpdated() external view returns (uint256) {
        return latestReserveData.updatedAt;
    }

    /**
     * @notice Returns the last request time for a given address, used for enforcing coolDown between requests.
     * @param _requester  The address of the requester to check the last request time for.
     */
    function getLastRequestTime(
        address _requester
    ) external view returns (uint256) {
        return lastRequestTime[_requester];
    }

    // =============================================================
    //                         ADMIN OPS
    // =============================================================

    function setSubscriptionId(uint64 _subscriptionId) external onlyOwner {
        require(_subscriptionId != 0, "bad subscriptionId");
        subscriptionId = _subscriptionId;
        emit OracleConfigUpdated(
            subscriptionId,
            donId,
            gasLimit,
            coolDown,
            apiUrl
        );
    }

    function setDonId(bytes32 _donId) external onlyOwner {
        require(_donId != bytes32(0), "bad donId");
        donId = _donId;
        emit OracleConfigUpdated(
            subscriptionId,
            donId,
            gasLimit,
            coolDown,
            apiUrl
        );
    }

    function setSource(string calldata _source) external onlyOwner {
        require(bytes(_source).length > 0, "empty source");
        source = _source;
    }

    function setApiUrl(string calldata _apiUrl) external onlyOwner {
        require(bytes(_apiUrl).length > 0, "empty apiUrl");
        apiUrl = _apiUrl;
        emit OracleConfigUpdated(
            subscriptionId,
            donId,
            gasLimit,
            coolDown,
            apiUrl
        );
    }

    function setGasLimit(uint32 _gasLimit) external onlyOwner {
        require(_gasLimit > 0, "zero gasLimit");
        require(_gasLimit <= 300_000, "gasLimit too high");
        gasLimit = _gasLimit;
        emit OracleConfigUpdated(
            subscriptionId,
            donId,
            gasLimit,
            coolDown,
            apiUrl
        );
    }

    function setCoolDown(uint256 _coolDown) external onlyOwner {
        require(_coolDown <= 1 days, "coolDown too long");
        coolDown = _coolDown;
        emit OracleConfigUpdated(
            subscriptionId,
            donId,
            gasLimit,
            coolDown,
            apiUrl
        );
    }

    /**
     * @notice Convenience function for updating the main oracle request config.
     * @dev Does not update source because source can be large; keep source update separate.
     */
    function setOracleConfig(
        uint64 _subscriptionId,
        bytes32 _donId,
        uint32 _gasLimit,
        uint256 _coolDown,
        string calldata _apiUrl
    ) external onlyOwner {
        require(_subscriptionId != 0, "bad subscriptionId");
        require(_donId != bytes32(0), "bad donId");
        require(_gasLimit > 0, "zero gasLimit");
        require(_gasLimit <= 300_000, "gasLimit too high");
        require(_coolDown <= 1 days, "coolDown too long");
        require(bytes(_apiUrl).length > 0, "empty apiUrl");

        subscriptionId = _subscriptionId;
        donId = _donId;
        gasLimit = _gasLimit;
        coolDown = _coolDown;
        apiUrl = _apiUrl;
        emit OracleConfigUpdated(
            subscriptionId,
            donId,
            gasLimit,
            coolDown,
            apiUrl
        );
    }
}
