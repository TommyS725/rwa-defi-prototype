// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.6.0
pragma solidity ^0.8.27;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IRWAToken is IERC20 {
    event CCIPAdminTransferred(
        address indexed previousAdmin,
        address indexed newAdmin
    );

    //burn and mint access control
    function mint(address to, uint256 amount) external;

    /// @dev Uses OZ ERC20 _burn to disallow burning from address(0).
    /// @dev Decreases the total supply.
    function burn(uint256 amount) external;

    /// @dev Alias for BurnFrom for compatibility with the older naming convention.
    /// @dev Uses burnFrom for all validation & logic.
    function burn(address account, uint256 amount) external;

    /// @dev Uses OZ ERC20 _burn to disallow burning from address(0).
    /// @dev Decreases the total supply.
    function burnFrom(address account, uint256 amount) external;

    /// @notice Returns the current CCIPAdmin
    function getCCIPAdmin() external view returns (address);

    /// @notice Transfers the CCIPAdmin role to a new address
    /// @dev only the owner can call this function, NOT the current ccipAdmin, and 1-step ownership transfer is used.
    /// @param newAdmin The address to transfer the CCIPAdmin role to. Setting to address(0) is a valid way to revoke
    /// the role
    function setCCIPAdmin(address newAdmin) external;
}
