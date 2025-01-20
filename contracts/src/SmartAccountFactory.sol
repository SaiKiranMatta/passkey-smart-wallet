// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@account-abstraction/contracts/core/BaseAccount.sol";
import "@account-abstraction/contracts/core/Helpers.sol";
import "@account-abstraction/contracts/interfaces/IEntryPoint.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@account-abstraction/contracts/interfaces/IAccount.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "lib/webauthn-sol/src/WebAuthn.sol";
import {LibClone} from "lib/solady/src/utils/LibClone.sol";
import "./SmartAccount.sol";

// Factory Contract
contract SmartAccountFactory {
    address public immutable implementation;
    
    error OwnerRequired();
    
    constructor(address implementation_) payable {
        implementation = implementation_;
    }
    
    function createAccount(bytes calldata webAuthnPubKey, uint256 nonce) 
        external 
        payable 
        returns (SmartAccount account)
    {
        if (webAuthnPubKey.length == 0) {
            revert OwnerRequired();
        }

        (uint256 pubKeyX, uint256 pubKeyY) = abi.decode(webAuthnPubKey, (uint256, uint256));
        
        (bool alreadyDeployed, address accountAddress) = 
            LibClone.createDeterministicERC1967(msg.value, implementation, _getSalt(webAuthnPubKey, nonce));
            
        account = SmartAccount(payable(accountAddress));
        
        if (!alreadyDeployed) {
            account.initialize(pubKeyX, pubKeyY);
        }
    }
    
    function getAddress(bytes calldata webAuthnPubKey, uint256 nonce) external view returns (address) {
        return LibClone.predictDeterministicAddress(
            initCodeHash(), 
            _getSalt(webAuthnPubKey, nonce),
            address(this)
        );
    }
    
    function initCodeHash() public view returns (bytes32) {
        return LibClone.initCodeHashERC1967(implementation);
    }
    
    function _getSalt(bytes calldata webAuthnPubKey, uint256 nonce) internal pure returns (bytes32) {
        return keccak256(abi.encode(webAuthnPubKey, nonce));
    }
}
