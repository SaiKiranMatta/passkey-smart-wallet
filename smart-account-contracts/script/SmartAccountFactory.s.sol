// script/DeploySmartAccount.s.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {EntryPoint} from "@account-abstraction/contracts/core/EntryPoint.sol";
import {SmartAccount} from "../src/SmartAccount.sol";
import {SmartAccountFactory} from "../src/SmartAccountFactory.sol";

contract DeploySmartAccount is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // Deploy EntryPoint
        EntryPoint entryPoint = new EntryPoint();
        console2.log("EntryPoint deployed at:", address(entryPoint));

        // Deploy SmartAccount Implementation
        SmartAccount smartAccountImpl = new SmartAccount(address(entryPoint));
        console2.log("SmartAccount Implementation deployed at:", address(smartAccountImpl));

        // Deploy Factory
        SmartAccountFactory factory = new SmartAccountFactory(address(smartAccountImpl));
        console2.log("SmartAccountFactory deployed at:", address(factory));

        // Optional: Create a test account with dummy WebAuthn public key
        // Note: This is just for testing on Anvil
        uint256 pubKeyX = 0x1234; // Replace with actual test public key
        uint256 pubKeyY = 0x5678; // Replace with actual test public key
        bytes memory webAuthnPubKey = abi.encode(pubKeyX, pubKeyY);
        factory.createAccount(webAuthnPubKey, 0);

        vm.stopBroadcast();

        // Save deployment addresses to a file
        string memory deploymentInfo = string(
            abi.encodePacked(
                "ENTRY_POINT_ADDRESS=", vm.toString(address(entryPoint)), "\n",
                "SMART_ACCOUNT_IMPL_ADDRESS=", vm.toString(address(smartAccountImpl)), "\n",
                "FACTORY_ADDRESS=", vm.toString(address(factory))
            )
        );
        vm.writeFile(".env.local", deploymentInfo);
    }
}