// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {IRouterClient} from "@chainlink/contracts-ccip/contracts/interfaces/IRouterClient.sol";
import {Client} from "@chainlink/contracts-ccip/contracts/libraries/Client.sol";

contract RWATokenBridge is Ownable {
    using SafeERC20 for IERC20;

    error NotEnoughLinkFee(uint256 currentBalance, uint256 requiredFee);
    error NotEnoughNativeFee(uint256 sent, uint256 required);
    error DestinationChainNotAllowlisted(uint64 destinationChainSelector);
    error InvalidReceiver();
    error InvalidAmount();

    event DestinationChainAllowlisted(
        uint64 indexed destinationChainSelector,
        bool allowed
    );

    event TokensSent(
        bytes32 indexed messageId,
        uint64 indexed destinationChainSelector,
        address indexed sender,
        address receiver,
        address token,
        uint256 amount,
        address feeToken,
        uint256 fee
    );

    IRouterClient public immutable router;
    IERC20 public immutable rwaToken;
    IERC20 public immutable linkToken;

    mapping(uint64 => bool) public allowlistedDestinationChains;

    constructor(
        address _owner,
        address _router,
        address _rwaToken,
        address _linkToken
    ) Ownable(_owner) {
        router = IRouterClient(_router);
        rwaToken = IERC20(_rwaToken);
        linkToken = IERC20(_linkToken);
    }

    receive() external payable {}

    function allowlistDestinationChain(
        uint64 destinationChainSelector,
        bool allowed
    ) external onlyOwner {
        allowlistedDestinationChains[destinationChainSelector] = allowed;

        emit DestinationChainAllowlisted(destinationChainSelector, allowed);
    }

    function sendTokenSponsored(
        uint64 destinationChainSelector,
        address receiver,
        uint256 amount
    ) external returns (bytes32 messageId) {
        if (!allowlistedDestinationChains[destinationChainSelector]) {
            revert DestinationChainNotAllowlisted(destinationChainSelector);
        }

        if (receiver == address(0)) {
            revert InvalidReceiver();
        }

        if (amount == 0) {
            revert InvalidAmount();
        }

        Client.EVM2AnyMessage memory message = _buildMessage(
            receiver,
            amount,
            address(linkToken)
        );

        uint256 fee = router.getFee(destinationChainSelector, message);

        uint256 currentLinkBalance = linkToken.balanceOf(address(this));

        if (currentLinkBalance < fee) {
            revert NotEnoughLinkFee(currentLinkBalance, fee);
        }

        // Pull user's RWA token.
        rwaToken.safeTransferFrom(msg.sender, address(this), amount);

        // Router will take user's RWA token and bridge contract's LINK fee.
        rwaToken.forceApprove(address(router), amount);
        linkToken.forceApprove(address(router), fee);

        messageId = router.ccipSend(destinationChainSelector, message);

        emit TokensSent(
            messageId,
            destinationChainSelector,
            msg.sender,
            receiver,
            address(rwaToken),
            amount,
            address(linkToken),
            fee
        );

        return messageId;
    }

    function sendTokenPayNative(
        uint64 destinationChainSelector,
        address receiver,
        uint256 amount
    ) external payable returns (bytes32 messageId) {
        if (!allowlistedDestinationChains[destinationChainSelector]) {
            revert DestinationChainNotAllowlisted(destinationChainSelector);
        }

        if (receiver == address(0)) {
            revert InvalidReceiver();
        }

        if (amount == 0) {
            revert InvalidAmount();
        }

        Client.EVM2AnyMessage memory message = _buildMessage(
            receiver,
            amount,
            address(0)
        );

        uint256 fee = router.getFee(destinationChainSelector, message);

        if (msg.value < fee) {
            revert NotEnoughNativeFee(msg.value, fee);
        }

        rwaToken.safeTransferFrom(msg.sender, address(this), amount);
        rwaToken.forceApprove(address(router), amount);

        messageId = router.ccipSend{value: fee}(
            destinationChainSelector,
            message
        );

        if (msg.value > fee) {
            (bool success, ) = payable(msg.sender).call{value: msg.value - fee}(
                ""
            );
            require(success, "Transfer failed.");
        }

        emit TokensSent(
            messageId,
            destinationChainSelector,
            msg.sender,
            receiver,
            address(rwaToken),
            amount,
            address(0),
            fee
        );

        return messageId;
    }

    function sendTokenPayLINK(
        uint64 destinationChainSelector,
        address receiver,
        uint256 amount
    ) external returns (bytes32 messageId) {
        if (!allowlistedDestinationChains[destinationChainSelector]) {
            revert DestinationChainNotAllowlisted(destinationChainSelector);
        }

        if (receiver == address(0)) {
            revert InvalidReceiver();
        }

        if (amount == 0) {
            revert InvalidAmount();
        }

        Client.EVM2AnyMessage memory message = _buildMessage(
            receiver,
            amount,
            address(linkToken)
        );

        uint256 fee = router.getFee(destinationChainSelector, message);

        rwaToken.safeTransferFrom(msg.sender, address(this), amount);
        linkToken.safeTransferFrom(msg.sender, address(this), fee);

        rwaToken.forceApprove(address(router), amount);
        linkToken.forceApprove(address(router), fee);

        messageId = router.ccipSend(destinationChainSelector, message);

        emit TokensSent(
            messageId,
            destinationChainSelector,
            msg.sender,
            receiver,
            address(rwaToken),
            amount,
            address(linkToken),
            fee
        );

        return messageId;
    }

    function getFeePayNative(
        uint64 destinationChainSelector,
        address receiver,
        uint256 amount
    ) external view returns (uint256 fee) {
        Client.EVM2AnyMessage memory message = _buildMessage(
            receiver,
            amount,
            address(0)
        );

        return router.getFee(destinationChainSelector, message);
    }

    function getFeePayLINK(
        uint64 destinationChainSelector,
        address receiver,
        uint256 amount
    ) external view returns (uint256 fee) {
        Client.EVM2AnyMessage memory message = _buildMessage(
            receiver,
            amount,
            address(linkToken)
        );

        return router.getFee(destinationChainSelector, message);
    }

    function _buildMessage(
        address receiver,
        uint256 amount,
        address feeToken
    ) internal view returns (Client.EVM2AnyMessage memory message) {
        Client.EVMTokenAmount[]
            memory tokenAmounts = new Client.EVMTokenAmount[](1);

        tokenAmounts[0] = Client.EVMTokenAmount({
            token: address(rwaToken),
            amount: amount
        });

        message = Client.EVM2AnyMessage({
            receiver: abi.encode(receiver),
            data: "",
            tokenAmounts: tokenAmounts,
            extraArgs: Client._argsToBytes(
                Client.EVMExtraArgsV1({gasLimit: 0})
            ),
            feeToken: feeToken
        });

        return message;
    }

    function withdrawNative(address payable to) external onlyOwner {
        (bool success, ) = to.call{value: address(this).balance}("");
        require(success, "Transfer failed.");
    }

    function withdrawToken(
        address token,
        address to,
        uint256 amount
    ) external onlyOwner {
        IERC20(token).safeTransfer(to, amount);
    }
}
