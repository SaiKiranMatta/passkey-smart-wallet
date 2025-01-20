import { abi } from "@/abi/abi";
import { factoryAbi } from "@/abi/factoryAbi";
import type { Address, TypedData } from "abitype";
import type * as WebAuthnP256 from "ox/WebAuthnP256";

import {
  Assign,
  BaseError,
  Client,
  decodeFunctionData,
  encodeFunctionData,
  hashMessage,
  hashTypedData,
  Hex,
  LocalAccount,
  Prettify,
  TypedDataDefinition,
} from "viem";
import {
  entryPoint07Abi,
  getUserOperationHash,
  SmartAccount,
  SmartAccountImplementation,
  toSmartAccount,
  UserOperation,
  WebAuthnAccount,
} from "viem/account-abstraction";
import { readContract } from "viem/actions";

export type ToGardenSmartAccountParameters = {
  address?: Address | undefined;
  client: Client;
  owner: WebAuthnAccount;
  sessionKey?: LocalAccount | undefined;
  nonce?: bigint | undefined;
};

export type ToGardenSmartAccountReturnType = Prettify<
  SmartAccount<GardenSmartAccountImplementation>
>;

export type GardenSmartAccountImplementation = Assign<
  SmartAccountImplementation<
    typeof entryPoint07Abi,
    "0.7",
    { abi: typeof abi; factory: { abi: typeof factoryAbi; address: Address } }
  >,
  {
    decodeCalls: NonNullable<SmartAccountImplementation["decodeCalls"]>;
    sign: NonNullable<SmartAccountImplementation["sign"]>;
  }
>;

/**
 * @description Create a Garden Smart Account with WebAuthn support and optional session keys
 * @param parameters - {@link ToGardenSmartAccountParameters}
 * @returns Garden Smart Account {@link ToGardenSmartAccountReturnType}
 */
export async function toGardenSmartAccount(
  parameters: ToGardenSmartAccountParameters
): Promise<ToGardenSmartAccountReturnType> {
  const { client, owner, sessionKey, nonce = 0n } = parameters;

  let address = parameters.address;

  const entryPoint = {
    abi: entryPoint07Abi,
    address: process.env.NEXT_PUBLIC_ENTRYPOINT_ADDRESS as Address,
    version: "0.7",
  } as const;

  const factory = {
    abi: factoryAbi,
    address: process.env.NEXT_PUBLIC_FACTORY_ADDRESS as Address,
  } as const;

  // Encode the WebAuthn public key for the factory
  const encodedPubKey = encodeWebAuthnPubKey(owner);

  return toSmartAccount({
    client,
    entryPoint,
    extend: { abi, factory },

    async decodeCalls(data) {
      const result = decodeFunctionData({
        abi,
        data,
      });

      if (!result.args) {
        throw new BaseError(
          `Unable to decode calls: args undefined for "${result.functionName}"`
        );
      }

      // Ensure to use type assertions to guarantee the correct types
      if (result.functionName === "execute") {
        return [
          {
            to: result.args[0] as Hex,
            value: result.args[1] as bigint,
            data: result.args[2] as Hex,
          },
        ];
      }

      if (result.functionName === "executeBatch") {
        const calls = result.args[0] as Array<{
          target: Hex;
          value: bigint;
          data: Hex;
        }>;

        return calls.map((arg) => ({
          to: arg.target,
          value: arg.value,
          data: arg.data,
        }));
      }

      throw new BaseError(
        `unable to decode calls for "${result.functionName}"`
      );
    },

    async getStubSignature() {
      return "0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000c0000000000000000000000000000000000000000000000000000000000000012000000000000000000000000000000000000000000000000000000000000000170000000000000000000000000000000000000000000000000000000000000001949fc7c88032b9fcb5f6efc7a7b8c63668eae9871b765e23123bb473ff57aa831a7c0d9276168ebcc29f2875a0239cffdf2a9cd1c2007c5c77c071db9264df1d000000000000000000000000000000000000000000000000000000000000002549960de5880e8c687434170f6476605b8fe4aeb9a28632c7995cf3ba831d97630500000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008a7b2274797065223a22776562617574686e2e676574222c226368616c6c656e6765223a2273496a396e6164474850596759334b7156384f7a4a666c726275504b474f716d59576f4d57516869467773222c226f726967696e223a2268747470733a2f2f7369676e2e636f696e626173652e636f6d222c2263726f73734f726967696e223a66616c73657d00000000000000000000000000000000000000000000";
    },

    async encodeCalls(calls) {
      if (calls.length !== 1)
        throw new BaseError("Garden smart account only supports single calls");

      return encodeFunctionData({
        abi,
        functionName: "execute",
        args: [calls[0].to, calls[0].value ?? 0n, calls[0].data ?? "0x"],
      });
    },

    async getAddress() {
      if (!address) {
        address = (await readContract(client, {
          ...factory,
          functionName: "getAddress",
          args: [encodedPubKey, nonce],
        })) as `0x${string}` | undefined;
      }
      if (!address) {
        throw new BaseError("Failed to fetch address");
      }
      return address;
    },

    async getFactoryArgs() {
      const factoryData = encodeFunctionData({
        abi: factory.abi,
        functionName: "createAccount",
        args: [encodedPubKey, nonce],
      });
      return { factory: factory.address, factoryData };
    },

    async sign(parameters) {
      // If session key is available and valid, use it for signing
      if (sessionKey?.sign) {
        const signature = await sessionKey.sign({ hash: parameters.hash });
        return encodeSignature({ isSessionKey: true, signature });
      }

      // Otherwise use WebAuthn signing
      const { signature, webauthn } = await owner.sign({
        hash: parameters.hash,
      });
      return encodeSignature({
        isSessionKey: false,
        signature: encodeWebAuthnSignature({ signature, webauthn }),
      });
    },

    async signMessage(parameters) {
      const hash = hashMessage(parameters.message);

      return await this.sign!({ hash });
    },

    async signTypedData(parameters) {
      const { domain, types, primaryType, message } =
        parameters as TypedDataDefinition<TypedData, string>;

      const hash = hashTypedData({
        domain,
        types,
        primaryType,
        message,
      });

      return await this.sign!({ hash });
    },

    async signUserOperation(parameters) {
      const { chainId = client.chain!.id, ...userOperation } = parameters;

      const address = await this.getAddress();
      const hash = getUserOperationHash({
        chainId,
        entryPointAddress: entryPoint.address,
        entryPointVersion: entryPoint.version,
        userOperation: {
          ...(userOperation as unknown as UserOperation),
          sender: address,
        },
      });

      return await this.sign!({ hash });
    },
  });
}

// Helper Functions

function encodeWebAuthnPubKey(owner: WebAuthnAccount): Hex {
  const cleanHex = owner.publicKey.startsWith("0x")
    ? owner.publicKey.slice(2)
    : owner.publicKey;

  if (cleanHex.length !== 128) {
    throw new Error(
      "Invalid public key format. Expected 64-byte hex string (128 characters)."
    );
  }

  // Extract x and y coordinates from the uncompressed public key
  const x = BigInt(`0x${cleanHex.slice(0, 64)}`);
  const y = BigInt(`0x${cleanHex.slice(64, 128)}`); // Take the last 64 characters

  // Encode the extracted x and y coordinates using ABI encoding
  return encodeFunctionData({
    abi: [
      {
        inputs: [
          { name: "x", type: "uint256" },
          { name: "y", type: "uint256" },
        ],
        name: "encode",
        outputs: [{ name: "", type: "bytes" }],
        stateMutability: "pure",
        type: "function",
      },
    ],
    functionName: "encode",
    args: [x, y],
  });
}

function encodeWebAuthnSignature({
  signature,
  webauthn,
}: {
  signature: Hex;
  webauthn: WebAuthnP256.SignMetadata;
}): Hex {
  return encodeFunctionData({
    abi: [
      {
        inputs: [
          {
            components: [
              { name: "authenticatorData", type: "bytes" },
              { name: "clientDataJSON", type: "string" },
              { name: "signature", type: "bytes" },
            ],
            name: "auth",
            type: "tuple",
          },
        ],
        name: "encode",
        outputs: [{ name: "", type: "bytes" }],
        type: "function",
      },
    ],
    functionName: "encode",
    args: [
      {
        authenticatorData: webauthn.authenticatorData,
        clientDataJSON: webauthn.clientDataJSON,
        signature,
      },
    ],
  });
}

function encodeSignature({
  isSessionKey,
  signature,
}: {
  isSessionKey: boolean;
  signature: Hex;
}): Hex {
  return encodeFunctionData({
    abi: [
      {
        inputs: [
          { name: "isSessionKey", type: "bool" },
          { name: "signature", type: "bytes" },
        ],
        name: "encode",
        outputs: [{ name: "", type: "bytes" }],
        type: "function",
      },
    ],
    functionName: "encode",
    args: [isSessionKey, signature],
  });
}
