// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.6.0
pragma solidity ^0.8.27;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IRWAToken} from "../interface/IRWAToken.sol";

contract RWAToken is IRWAToken, ERC20, ERC20Burnable, AccessControl, ERC20Permit, Ownable {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    /// @dev the CCIPAdmin can be used to register with the CCIP token admin registry, but has no other special powers,
    /// and can only be transferred by the owner.
    address internal _ccipAdmin;

    constructor(address _owner)
        ERC20("Mock Treasury RWA Token", "mTRWA")
        ERC20Permit("Mock Treasury RWA Token")
        Ownable(_owner)
    {
        _grantRole(DEFAULT_ADMIN_ROLE, _owner);
        _ccipAdmin = _owner; 
    }

    //burn and mint access control
    function mint(address to, uint256 amount) public onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }

    /// @inheritdoc ERC20Burnable
  /// @dev Uses OZ ERC20 _burn to disallow burning from address(0).
  /// @dev Decreases the total supply.
  function burn(
    uint256 amount
  ) public  override(ERC20Burnable,IRWAToken) onlyRole(BURNER_ROLE) {
    super.burn(amount);
  }

  /// @dev Alias for BurnFrom for compatibility with the older naming convention.
  /// @dev Uses burnFrom for all validation & logic.
  function burn(address account, uint256 amount) public {
    burnFrom(account, amount);
  }

  /// @inheritdoc ERC20Burnable
  /// @dev Uses OZ ERC20 _burn to disallow burning from address(0).
  /// @dev Decreases the total supply.
  function burnFrom(
    address account,
    uint256 amount
  ) public  override(ERC20Burnable,IRWAToken) onlyRole(BURNER_ROLE) {
    super.burnFrom(account, amount);
  }

  // ================================================================
  // │                            Roles                             │
  // ================================================================

  /// @notice grants both mint and burn roles to `burnAndMinter`.
  /// @dev calls public functions so this function does not require
  /// access controls. This is handled in the inner functions.
  function grantMintAndBurnRoles(
    address burnAndMinter
  ) external virtual {
    grantRole(MINTER_ROLE, burnAndMinter);
    grantRole(BURNER_ROLE, burnAndMinter);
  }

  function grantMinter(
    address minter
  ) external virtual {
    grantRole(MINTER_ROLE, minter);
  }

  function grantBurner(
    address burner
  ) external virtual {
    grantRole(BURNER_ROLE, burner);
  }



  /// @notice Returns the current CCIPAdmin
  function getCCIPAdmin() external view virtual returns (address) {
    return _ccipAdmin;
  }

  /// @notice Transfers the CCIPAdmin role to a new address
  /// @dev only the owner can call this function, NOT the current ccipAdmin, and 1-step ownership transfer is used.
  /// @param newAdmin The address to transfer the CCIPAdmin role to. Setting to address(0) is a valid way to revoke
  /// the role
  function setCCIPAdmin(
    address newAdmin
  ) external virtual onlyRole(DEFAULT_ADMIN_ROLE) {
    address currentAdmin = _ccipAdmin;

    _ccipAdmin = newAdmin;

    emit CCIPAdminTransferred(currentAdmin, newAdmin);
  }
}