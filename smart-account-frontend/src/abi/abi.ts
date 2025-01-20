export const abi = [
    {
      type: "constructor",
      inputs: [
        {
          name: "entryPoint",
          type: "address",
          internalType: "address",
        },
      ],
      stateMutability: "nonpayable",
    },
    {
      type: "receive",
      stateMutability: "payable",
    },
    {
      type: "function",
      name: "SESSION_VALIDITY",
      inputs: [],
      outputs: [
        {
          name: "",
          type: "uint256",
          internalType: "uint256",
        },
      ],
      stateMutability: "view",
    },
    {
      type: "function",
      name: "UPGRADE_INTERFACE_VERSION",
      inputs: [],
      outputs: [
        {
          name: "",
          type: "string",
          internalType: "string",
        },
      ],
      stateMutability: "view",
    },
    {
      type: "function",
      name: "createSessionKey",
      inputs: [
        {
          name: "sessionKeyAddress",
          type: "address",
          internalType: "address",
        },
        {
          name: "webAuthnData",
          type: "bytes",
          internalType: "bytes",
        },
      ],
      outputs: [],
      stateMutability: "nonpayable",
    },
    {
      type: "function",
      name: "execute",
      inputs: [
        {
          name: "dest",
          type: "address",
          internalType: "address",
        },
        {
          name: "value",
          type: "uint256",
          internalType: "uint256",
        },
        {
          name: "functionData",
          type: "bytes",
          internalType: "bytes",
        },
      ],
      outputs: [],
      stateMutability: "nonpayable",
    },
    {
      type: "function",
      name: "getEntryPoint",
      inputs: [],
      outputs: [
        {
          name: "",
          type: "address",
          internalType: "address",
        },
      ],
      stateMutability: "view",
    },
    {
      type: "function",
      name: "initialize",
      inputs: [
        {
          name: "_ownerPubKeyX",
          type: "uint256",
          internalType: "uint256",
        },
        {
          name: "_ownerPubKeyY",
          type: "uint256",
          internalType: "uint256",
        },
      ],
      outputs: [],
      stateMutability: "nonpayable",
    },
    {
      type: "function",
      name: "ownerPubKeyX",
      inputs: [],
      outputs: [
        {
          name: "",
          type: "uint256",
          internalType: "uint256",
        },
      ],
      stateMutability: "view",
    },
    {
      type: "function",
      name: "ownerPubKeyY",
      inputs: [],
      outputs: [
        {
          name: "",
          type: "uint256",
          internalType: "uint256",
        },
      ],
      stateMutability: "view",
    },
    {
      type: "function",
      name: "proxiableUUID",
      inputs: [],
      outputs: [
        {
          name: "",
          type: "bytes32",
          internalType: "bytes32",
        },
      ],
      stateMutability: "view",
    },
    {
      type: "function",
      name: "sessionKeys",
      inputs: [
        {
          name: "",
          type: "address",
          internalType: "address",
        },
      ],
      outputs: [
        {
          name: "validUntil",
          type: "uint256",
          internalType: "uint256",
        },
        {
          name: "isValid",
          type: "bool",
          internalType: "bool",
        },
      ],
      stateMutability: "view",
    },
    {
      type: "function",
      name: "upgradeToAndCall",
      inputs: [
        {
          name: "newImplementation",
          type: "address",
          internalType: "address",
        },
        {
          name: "data",
          type: "bytes",
          internalType: "bytes",
        },
      ],
      outputs: [],
      stateMutability: "payable",
    },
    {
      type: "function",
      name: "validateUserOp",
      inputs: [
        {
          name: "userOp",
          type: "tuple",
          internalType: "struct PackedUserOperation",
          components: [
            {
              name: "sender",
              type: "address",
              internalType: "address",
            },
            {
              name: "nonce",
              type: "uint256",
              internalType: "uint256",
            },
            {
              name: "initCode",
              type: "bytes",
              internalType: "bytes",
            },
            {
              name: "callData",
              type: "bytes",
              internalType: "bytes",
            },
            {
              name: "accountGasLimits",
              type: "bytes32",
              internalType: "bytes32",
            },
            {
              name: "preVerificationGas",
              type: "uint256",
              internalType: "uint256",
            },
            {
              name: "gasFees",
              type: "bytes32",
              internalType: "bytes32",
            },
            {
              name: "paymasterAndData",
              type: "bytes",
              internalType: "bytes",
            },
            {
              name: "signature",
              type: "bytes",
              internalType: "bytes",
            },
          ],
        },
        {
          name: "userOpHash",
          type: "bytes32",
          internalType: "bytes32",
        },
        {
          name: "missingAccountFunds",
          type: "uint256",
          internalType: "uint256",
        },
      ],
      outputs: [
        {
          name: "validationData",
          type: "uint256",
          internalType: "uint256",
        },
      ],
      stateMutability: "nonpayable",
    },
    {
      type: "event",
      name: "Initialized",
      inputs: [
        {
          name: "version",
          type: "uint64",
          indexed: false,
          internalType: "uint64",
        },
      ],
      anonymous: false,
    },
    {
      type: "event",
      name: "Initialized",
      inputs: [
        {
          name: "pubKeyX",
          type: "uint256",
          indexed: false,
          internalType: "uint256",
        },
        {
          name: "pubKeyY",
          type: "uint256",
          indexed: false,
          internalType: "uint256",
        },
      ],
      anonymous: false,
    },
    {
      type: "event",
      name: "SessionKeyCreated",
      inputs: [
        {
          name: "key",
          type: "address",
          indexed: true,
          internalType: "address",
        },
        {
          name: "validUntil",
          type: "uint256",
          indexed: false,
          internalType: "uint256",
        },
      ],
      anonymous: false,
    },
    {
      type: "event",
      name: "Upgraded",
      inputs: [
        {
          name: "implementation",
          type: "address",
          indexed: true,
          internalType: "address",
        },
      ],
      anonymous: false,
    },
    {
      type: "error",
      name: "AddressEmptyCode",
      inputs: [
        {
          name: "target",
          type: "address",
          internalType: "address",
        },
      ],
    },
    {
      type: "error",
      name: "ECDSAInvalidSignature",
      inputs: [],
    },
    {
      type: "error",
      name: "ECDSAInvalidSignatureLength",
      inputs: [
        {
          name: "length",
          type: "uint256",
          internalType: "uint256",
        },
      ],
    },
    {
      type: "error",
      name: "ECDSAInvalidSignatureS",
      inputs: [
        {
          name: "s",
          type: "bytes32",
          internalType: "bytes32",
        },
      ],
    },
    {
      type: "error",
      name: "ERC1967InvalidImplementation",
      inputs: [
        {
          name: "implementation",
          type: "address",
          internalType: "address",
        },
      ],
    },
    {
      type: "error",
      name: "ERC1967NonPayable",
      inputs: [],
    },
    {
      type: "error",
      name: "FailedCall",
      inputs: [],
    },
    {
      type: "error",
      name: "InvalidInitialization",
      inputs: [],
    },
    {
      type: "error",
      name: "NotInitializing",
      inputs: [],
    },
    {
      type: "error",
      name: "SmartAccount__AlreadyInitialized",
      inputs: [],
    },
    {
      type: "error",
      name: "SmartAccount__CallFailed",
      inputs: [
        {
          name: "",
          type: "bytes",
          internalType: "bytes",
        },
      ],
    },
    {
      type: "error",
      name: "SmartAccount__InvalidOwner",
      inputs: [],
    },
    {
      type: "error",
      name: "SmartAccount__InvalidSignature",
      inputs: [],
    },
    {
      type: "error",
      name: "SmartAccount__InvalidSignatureLength",
      inputs: [],
    },
    {
      type: "error",
      name: "SmartAccount__NotFromEntryPoint",
      inputs: [],
    },
    {
      type: "error",
      name: "SmartAccount__NotFromEntryPointOrOwner",
      inputs: [],
    },
    {
      type: "error",
      name: "UUPSUnauthorizedCallContext",
      inputs: [],
    },
    {
      type: "error",
      name: "UUPSUnsupportedProxiableUUID",
      inputs: [
        {
          name: "slot",
          type: "bytes32",
          internalType: "bytes32",
        },
      ],
    },
  ];
  
  