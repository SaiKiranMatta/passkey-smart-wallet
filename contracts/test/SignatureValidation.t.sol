// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console2} from "forge-std/Test.sol";
import "lib/webauthn-sol/src/WebAuthn.sol";

contract WebAuthnSignatureTest is Test {
    function test_WebAuthnSignatureVerification() public {
        // Hardcoded UserOp Hash
        bytes32 userOpHash = 0xda091093329e547d54bd42f6ad44a07818395a26f6f511f7c77c7bb84c8055e5;

        bytes memory signature = hex"000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000c000000000000000000000000000000000000000000000000000000000000001200000000000000000000000000000000000000000000000000000000000000017000000000000000000000000000000000000000000000000000000000000000104a9b22428ec24aabeba4b73424c74a1feb8d7245c217ce31ee97dc75687860556d4960f3a5c035815ae27ae2aa8a7687663cc5b722feadcbc30f689e2c00294000000000000000000000000000000000000000000000000000000000000002549960de5880e8c687434170f6476605b8fe4aeb9a28632c7995cf3ba831d97631d0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000867b2274797065223a22776562617574686e2e676574222c226368616c6c656e6765223a2232676b516b7a4b655648315576554c32725553676542673557696232395248337833783775457941566555222c226f726967696e223a22687474703a2f2f6c6f63616c686f73743a33303030222c2263726f73734f726967696e223a66616c73657d0000000000000000000000000000000000000000000000000000";

        // Hardcoded Public Key X and Y coordinates
        uint256 x = 0xc6a2aeced348c23c6eddc596f6c787fbc99a828d6d3f657d1144b48844eb77a9;
        uint256 y = 0xd65b4d03e966b1d6d3c44e92bb9e68b82e0222718b8095d0d94c0b67ccfc9440;

        // Hardcoded WebAuthn Signature Components
        WebAuthn.WebAuthnAuth memory auth = abi.decode(signature, (WebAuthn.WebAuthnAuth));

        // Attempt WebAuthn verification
        bool isValidOwner = WebAuthn.verify({
            challenge: abi.encode(userOpHash),
            requireUV: false,
            webAuthnAuth: auth,
            x: x,
            y: y
        });

        // Assert the verification result
        assertTrue(isValidOwner, "WebAuthn signature verification should pass");
    }

    
}