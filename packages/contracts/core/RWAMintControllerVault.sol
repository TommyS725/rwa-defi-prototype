// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/utils/math/Math.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import {IReserveOracle, ReserveData} from "../interface/IReserveOracle.sol";
import {IRWAToken} from "../interface/IRWAToken.sol";

/**
 * @title RWAMintControllerVault
 * @notice Core prototype contract for oracle-gated RWA token issuance.
 *
 * Design:
 * - This contract is both the mint controller and USDC reserve vault.
 * - The RWA token itself is a separate ERC-20 contract.
 * - Oracle reports adjusted off-chain reserve value:
 *      adjustedOffchainReserveUSD = gross asset value - liabilities - fees
 * - Contract calculates NAV using:
 *      NAV = (adjustedOffchainReserveUSD + onchainUSDCBalance) / totalSupply
 *
 * Simplified prototype logic:
 * - No issuer withdrawal.
 * - No fund cap.
 * - No redemption liquidity threshold.
 * - Mint transfers only the USDC actually required after rounding.
 * - Redeem burns only the RWA actually required after rounding.
 * - Redemption only works if this contract has enough USDC.
 * - If not enough USDC, user can call requestRedeem().
 *
 * Units:
 * - Oracle USD values use 18 decimals.
 * - NAV uses USD 18 decimals.
 * - USDC decimals are read from the USDC token.
 * - RWA token decimals are read from the RWA token.
 */
contract RWAMintControllerVault is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IReserveOracle public oracle;
    IERC20 public immutable usdc;
    IRWAToken public immutable rwaToken;

    uint8 private immutable usdcDecimals;
    uint8 private immutable rwaDecimals;

    /**
     * @notice 10 ** rwaDecimals.
     * Example: if RWA token has 18 decimals, rwaUnit = 1e18.
     */
    uint256 private immutable rwaUnit;

    /**
     * @notice Scale USDC native units into USD18 accounting value.
     * Example: if USDC has 6 decimals, usdcToUSD18 = 1e12.
     */
    uint256 private immutable usdcToUSD18;

    address public issuer;

    /**
     * @notice Initial NAV in USD18.
     * Example: $100 = 100e18.
     */
    uint256 private immutable initialNAVUSD18;

    bool public initialized;
    bool public mintPaused;
    bool public redeemPaused;

    /**
     * @notice Maximum allowed oracle data age.
     */
    uint256 public maxOracleDelay;

    event FundInitialized(
        address indexed issuer,
        uint256 adjustedOffchainReserveUSD18,
        uint256 initialNAVUSD18,
        uint256 initialSupply
    );

    event Minted(
        address indexed user,
        uint256 usdcPaid,
        uint256 navUSD18,
        uint256 rwaMinted
    );

    event Redeemed(
        address indexed user,
        uint256 rwaBurned,
        uint256 navUSD18,
        uint256 usdcPaid
    );

    event RedemptionRequested(
        address indexed user,
        uint256 rwaAmount,
        uint256 navUSD18,
        uint256 expectedUSDCAmount
    );

    event MintPausedSet(bool paused);
    event RedeemPausedSet(bool paused);
    event MaxOracleDelaySet(uint256 maxOracleDelay);
    event IssuerSet(address indexed issuer);
    event OracleSet(address indexed oracle);
    event USDCSet(address indexed usdc);

    constructor(
        address _oracle,
        address _usdc,
        address _rwaToken,
        address _issuer,
        uint256 _initialNAVUSD18,
        uint256 _maxOracleDelay
    ) Ownable(msg.sender) {
        require(_oracle != address(0), "bad oracle");
        require(_usdc != address(0), "bad usdc");
        require(_rwaToken != address(0), "bad rwa token");
        require(_issuer != address(0), "bad issuer");
        require(_initialNAVUSD18 > 0, "bad initial NAV");

        oracle = IReserveOracle(_oracle);
        usdc = IERC20(_usdc);
        rwaToken = IRWAToken(_rwaToken);
        issuer = _issuer;
        initialNAVUSD18 = _initialNAVUSD18;

        usdcDecimals = IERC20Metadata(_usdc).decimals();
        rwaDecimals = IERC20Metadata(_rwaToken).decimals();

        require(usdcDecimals <= 18, "USDC decimals too high");
        require(rwaDecimals <= 18, "RWA decimals too high");

        rwaUnit = 10 ** uint256(rwaDecimals);
        usdcToUSD18 = 10 ** uint256(18 - usdcDecimals);

        maxOracleDelay = _maxOracleDelay;
    }

    // =============================================================
    //                         INITIALIZATION
    // =============================================================

    /**
     * @notice Initializes the fund with:
     * - positive off-chain reserve
     * - zero on-chain USDC
     * - positive RWA supply
     *
     * No USDC is transferred here.
     * Initial supply is backed by oracle-reported off-chain reserve.
     */
    function initializeFund() external onlyOwner {
        require(!initialized, "already initialized");

        ReserveData memory data = _getValidOracleData();

        require(data.adjustedOffchainReserveUSD > 0, "no offchain reserve");

        uint256 initialSupply = Math.mulDiv(
            data.adjustedOffchainReserveUSD,
            rwaUnit,
            initialNAVUSD18
        );

        require(initialSupply > 0, "zero initial supply");

        initialized = true;

        rwaToken.mint(issuer, initialSupply);

        emit FundInitialized(
            issuer,
            data.adjustedOffchainReserveUSD,
            initialNAVUSD18,
            initialSupply
        );
    }

    // =============================================================
    //                         PUBLIC VIEW LOGIC
    // =============================================================

    /**
     * @notice Public function to calculate current total backing value.
     * @dev Validates oracle data before calculation.
     */
    function totalBackingValueUSD18() public view returns (uint256) {
        ReserveData memory data = _getValidOracleData();
        return _totalBackingValueUSD18(data);
    }

    /**
     * @notice Public function to calculate current NAV per RWA token.
     * @dev Validates oracle data before calculation.
     */
    function navPerTokenUSD18() public view returns (uint256) {
        uint256 supply = rwaToken.totalSupply();
        if (supply == 0) {
            return initialNAVUSD18;
        }
        ReserveData memory data = _getValidOracleData();
        return _navPerTokenUSD18(data);
    }

    /**
     * @notice Returns this contract's current USDC balance.
     * @dev Uses native USDC decimals.
     */
    function vaultUSDCBalance() external view returns (uint256) {
        return usdc.balanceOf(address(this));
    }

    /**
     * @notice Preview mint result for a given maximum USDC input.
     */
    function previewMintWithUSDC(
        uint256 maxUSDCIn
    ) external view returns (uint256 rwaAmount, uint256 usdcRequired) {
        ReserveData memory data = _getValidOracleData();
        uint256 navUSD18 = _navPerTokenUSD18(data);

        return _quoteMintWithUSDC(maxUSDCIn, navUSD18);
    }

    /**
     * @notice Preview redemption result for a given maximum RWA burn amount.
     */
    function previewRedeem(
        uint256 maxRwaIn
    ) external view returns (uint256 rwaRequired, uint256 usdcAmount) {
        ReserveData memory data = _getValidOracleData();
        uint256 navUSD18 = _navPerTokenUSD18(data);

        return _quoteRedeem(maxRwaIn, navUSD18);
    }

    // =============================================================
    //                         INTERNAL NAV LOGIC
    // =============================================================

    function _totalBackingValueUSD18(
        ReserveData memory data
    ) internal view returns (uint256) {
        uint256 onchainUSDCUSD18 = usdc.balanceOf(address(this)) * usdcToUSD18;

        return data.adjustedOffchainReserveUSD + onchainUSDCUSD18;
    }

    function _navPerTokenUSD18(
        ReserveData memory data
    ) internal view returns (uint256) {
        uint256 supply = rwaToken.totalSupply();

        if (supply == 0) {
            return initialNAVUSD18;
        }

        uint256 backingUSD18 = _totalBackingValueUSD18(data);

        return Math.mulDiv(backingUSD18, rwaUnit, supply);
    }

    // =============================================================
    //                         MINT LOGIC
    // =============================================================

    /**
     * @notice User specifies the maximum USDC they are willing to spend.
     *
     * Because of rounding:
     * - maxUSDCIn is the maximum payment.
     * - contract calculates rwaAmount.
     * - contract calculates usdcRequired.
     * - contract transfers only usdcRequired, not full maxUSDCIn.
     *
     * @param maxUSDCIn Maximum USDC user is willing to pay.
     * @param minRwaOut Minimum RWA token amount user expects.
     */
    function mintWithUSDC(
        uint256 maxUSDCIn,
        uint256 minRwaOut
    ) external nonReentrant returns (uint256 rwaAmount, uint256 usdcRequired) {
        require(initialized, "not initialized");
        require(!mintPaused, "mint paused");
        require(maxUSDCIn > 0, "zero USDC");

        ReserveData memory data = _getValidOracleData();
        uint256 navUSD18 = _navPerTokenUSD18(data);

        (rwaAmount, usdcRequired) = _quoteMintWithUSDC(maxUSDCIn, navUSD18);

        require(rwaAmount > 0, "zero mint amount");
        require(rwaAmount >= minRwaOut, "insufficient RWA out");
        require(usdcRequired > 0, "zero USDC required");
        require(usdcRequired <= maxUSDCIn, "USDC required exceeds max");

        usdc.safeTransferFrom(msg.sender, address(this), usdcRequired);

        rwaToken.mint(msg.sender, rwaAmount);

        emit Minted(msg.sender, usdcRequired, navUSD18, rwaAmount);
    }

    function _quoteMintWithUSDC(
        uint256 maxUSDCIn,
        uint256 navUSD18
    ) internal view returns (uint256 rwaAmount, uint256 usdcRequired) {
        require(navUSD18 > 0, "bad NAV");

        uint256 maxPaymentUSD18 = maxUSDCIn * usdcToUSD18;

        // Calculate maximum RWA mintable from maxUSDCIn.
        // Rounds down so the user will never pay more than maxUSDCIn.
        rwaAmount = Math.mulDiv(maxPaymentUSD18, rwaUnit, navUSD18);

        if (rwaAmount == 0) {
            return (0, 0);
        }

        // Calculate actual USD18 required for the rounded RWA amount.
        // Round up so the user does not underpay.
        uint256 requiredUSD18 = Math.ceilDiv(rwaAmount * navUSD18, rwaUnit);

        // Convert USD18 to USDC native decimals.
        // Round up to avoid underpayment due to USDC decimals.
        usdcRequired = Math.ceilDiv(requiredUSD18, usdcToUSD18);
    }

    // =============================================================
    //                       REDEMPTION LOGIC
    // =============================================================

    /**
     * @notice Limited on-chain redemption.
     *
     * User specifies the maximum RWA they are willing to burn.
     *
     * Because of rounding:
     * - maxRwaIn is the maximum burn amount.
     * - contract calculates usdcAmount.
     * - contract calculates rwaRequired.
     * - contract burns only rwaRequired, not full maxRwaIn.
     *
     * Redemption only succeeds if this contract has enough USDC.
     *
     * @param maxRwaIn Maximum RWA token amount user is willing to burn.
     * @param minUSDCOut Minimum USDC amount user expects.
     */
    function redeem(
        uint256 maxRwaIn,
        uint256 minUSDCOut
    ) external nonReentrant returns (uint256 rwaRequired, uint256 usdcAmount) {
        require(initialized, "not initialized");
        require(!redeemPaused, "redeem paused");
        require(maxRwaIn > 0, "zero RWA");

        ReserveData memory data = _getValidOracleData();
        uint256 navUSD18 = _navPerTokenUSD18(data);

        (rwaRequired, usdcAmount) = _quoteRedeem(maxRwaIn, navUSD18);

        require(rwaRequired > 0, "zero RWA required");
        require(rwaRequired <= maxRwaIn, "RWA required exceeds max");
        require(usdcAmount > 0, "zero redeem amount");
        require(usdcAmount >= minUSDCOut, "insufficient USDC out");

        require(
            usdc.balanceOf(address(this)) >= usdcAmount,
            "insufficient USDC liquidity"
        );

        rwaToken.burn(msg.sender, rwaRequired);

        usdc.safeTransfer(msg.sender, usdcAmount);

        emit Redeemed(msg.sender, rwaRequired, navUSD18, usdcAmount);
    }

    function _quoteRedeem(
        uint256 maxRwaIn,
        uint256 navUSD18
    ) internal view returns (uint256 rwaRequired, uint256 usdcAmount) {
        require(navUSD18 > 0, "bad NAV");

        // Maximum USD18 value represented by maxRwaIn.
        // Rounds down so the contract never overpays.
        uint256 maxRedeemUSD18 = Math.mulDiv(maxRwaIn, navUSD18, rwaUnit);

        // Convert USD18 to USDC native decimals.
        // Rounds down because USDC cannot pay fractional smallest units.
        usdcAmount = maxRedeemUSD18 / usdcToUSD18;

        if (usdcAmount == 0) {
            return (0, 0);
        }

        // Actual USD18 value paid out in USDC.
        uint256 paidUSD18 = usdcAmount * usdcToUSD18;

        // Calculate RWA amount required for paid USDC.
        // Round up so the contract does not under-burn.
        rwaRequired = Math.ceilDiv(paidUSD18 * rwaUnit, navUSD18);
    }

    /**
     * @notice Emits a redemption request when instant on-chain USDC
     * liquidity is unavailable.
     *
     * This does not burn tokens.
     * It models real RWA redemption where issuer processing and
     * off-chain settlement may be required.
     */
    function requestRedeem(uint256 maxRwaIn) external {
        require(initialized, "not initialized");
        require(maxRwaIn > 0, "zero RWA");

        ReserveData memory data = _getValidOracleData();
        uint256 navUSD18 = _navPerTokenUSD18(data);

        (uint256 rwaRequired, uint256 expectedUSDCAmount) = _quoteRedeem(
            maxRwaIn,
            navUSD18
        );

        require(rwaRequired > 0, "zero RWA required");
        require(expectedUSDCAmount > 0, "zero redeem amount");
        require(
            rwaToken.balanceOf(msg.sender) >= rwaRequired,
            "insufficient RWA balance"
        );

        emit RedemptionRequested(
            msg.sender,
            rwaRequired,
            navUSD18,
            expectedUSDCAmount
        );
    }

    // =============================================================
    //                         ADMIN LOGIC
    // =============================================================

    function setMintPaused(bool paused) external onlyOwner {
        mintPaused = paused;
        emit MintPausedSet(paused);
    }

    function setRedeemPaused(bool paused) external onlyOwner {
        redeemPaused = paused;
        emit RedeemPausedSet(paused);
    }

    function setMaxOracleDelay(uint256 _maxOracleDelay) external onlyOwner {
        require(_maxOracleDelay > 0, "bad delay");

        maxOracleDelay = _maxOracleDelay;

        emit MaxOracleDelaySet(_maxOracleDelay);
    }

    function setIssuer(address _issuer) external onlyOwner {
        require(_issuer != address(0), "bad issuer");

        issuer = _issuer;

        emit IssuerSet(_issuer);
    }

    function setOracle(address _oracle) external onlyOwner {
        require(_oracle != address(0), "bad oracle");

        oracle = IReserveOracle(_oracle);

        emit OracleSet(_oracle);
    }

    function setUSDC(address _oracle) external onlyOwner {
        require(_oracle != address(0), "bad oracle");

        oracle = IReserveOracle(_oracle);

        emit OracleSet(_oracle);
    }

    // =============================================================
    //                         INTERNAL ORACLE LOGIC
    // =============================================================

    function _getValidOracleData()
        internal
        view
        returns (ReserveData memory data)
    {
        data = oracle.getLatestReserveData();

        require(data.reserveValid, "reserve invalid");
        require(data.updatedAt > 0, "oracle not updated");

        require(
            maxOracleDelay == 0 ||
                (block.timestamp - data.updatedAt <= maxOracleDelay),
            "oracle data stale"
        );

        return data;
    }
}
