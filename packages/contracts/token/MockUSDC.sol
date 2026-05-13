// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.6.0
pragma solidity ^0.8.27;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

contract MockUSDC is ERC20, Ownable, ERC20Permit {
    mapping(address => uint256) private lastFaucetAt;
    uint8 private constant _decimals = 6;
    uint256 private constant FAUCET_AMOUNT = 10_000 * 10 ** _decimals;

    constructor(
        address initialOwner
    ) ERC20("MockUSDC", "mUSDC") ERC20Permit("MockUSDC") Ownable(initialOwner) {
        _mint(initialOwner, FAUCET_AMOUNT);
    }

    function decimals() public pure override returns (uint8) {
        return _decimals;
    }

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    function faucet() external {
        require(block.timestamp >= lastFaucetAt[msg.sender] + 1 hours, "wait");
        lastFaucetAt[msg.sender] = block.timestamp;
        _mint(msg.sender, FAUCET_AMOUNT);
    }

    function getLastFaucetAt(address _user) external view returns(uint256){
        return lastFaucetAt[_user];
    }

    function getFaucetAmount() external  pure returns(uint256){
        return FAUCET_AMOUNT;
    }
}
