"use client"

import { useState, useEffect } from "react";
import { WebAuthnP256 } from "ox";
import { createPublicClient, http, parseAbi } from "viem";
import { foundry, mainnet } from "viem/chains";
import { createWebAuthnCredential, toCoinbaseSmartAccount, toWebAuthnAccount } from "viem/account-abstraction";
import { toGardenSmartAccount } from "@/utils/toGardenSmartAccount";

interface WalletState {
  credential: WebAuthnP256.P256Credential | null;
  accountAddress: string | null;
  isRegistering: boolean;
  error: string | null;
}

const FACTORY_ABI = parseAbi([
  "function createAccount(bytes calldata webAuthnPubKey, uint256 nonce) external payable returns (address)",
  "function getAddress(bytes calldata webAuthnPubKey, uint256 nonce) external view returns (address)",
]);

export default function WebAuthnWallet() {
  const [state, setState] = useState<WalletState>({
    credential: null,
    accountAddress: null,
    isRegistering: false,
    error: null,
  });

  const client = createPublicClient({
    chain: foundry,
    transport: http("http://localhost:8545"),
  });

  useEffect(() => {
    // Load stored credential from localStorage
    const storedCredential = localStorage.getItem("webauthn_credential");
    const storedAddress = localStorage.getItem("wallet_address");

    if (storedCredential && storedAddress) {
      setState((prev) => ({
        ...prev,
        credential: JSON.parse(storedCredential),
        accountAddress: storedAddress,
      }));
    }
  }, []);

  const registerNewAccount = async (username: string) => {
    setState((prev) => ({ ...prev, isRegistering: true, error: null }));

    try {
      // Create new WebAuthn credential
      const credential = await createWebAuthnCredential({
        name: username,
      });

      const account = toWebAuthnAccount({
        credential,
      })
      const smartAccount = await toGardenSmartAccount({
        client, 
        owner: account,
      })

      localStorage.setItem("garden_acc_address", smartAccount.address);
      
      // // Get predicted account address
      // const predictedAddress = await client.readContract({
      //   address: process.env.NEXT_PUBLIC_FACTORY_ADDRESS as `0x${string}`,
      //   abi: FACTORY_ABI,
      //   functionName: "getAddress",
      //   args: [webAuthnPubKey, 0n],
      // });

      // Store credentials
      localStorage.setItem("webauthn_credential", JSON.stringify(credential));
      // localStorage.setItem("wallet_address", predictedAddress);

      // setState((prev) => ({
      //   ...prev,
      //   credential,
      //   accountAddress: predictedAddress,
      //   isRegistering: false,
      // }));
    } catch (error) {
      console.error("Registration failed:", error);
      setState((prev) => ({
        ...prev,
        isRegistering: false,
        error: error instanceof Error ? error.message : "Registration failed",
      }));
    }
  };

  const signMessage = async (message: string) => {
    if (!state.credential) return;

    try {
      const { metadata, signature } = await WebAuthnP256.sign({
        credentialId: state.credential.id,
        challenge: `0x${Buffer.from(message).toString('hex')}` as `0x${string}`,
      });

      // Verify signature
      const verified = await WebAuthnP256.verify({
        metadata,
        challenge: `0x${Buffer.from(message).toString('hex')}` as `0x${string}`,
        publicKey: state.credential.publicKey,
        signature,
      });

      console.log("Signature verified:", verified);
      console.log("Signature details:", { metadata, signature });
    } catch (error) {
      console.error("Signing failed:", error);
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "Signing failed",
      }));
    }
  };

  // Helper function to encode public key for smart contract


  const [username, setUsername] = useState<string>("");

  return (
    <div className="p-6 mx-auto bg-white rounded-xl shadow-md flex flex-col items-center justify-center min-h-screen">
      {state.error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
          {state.error}
        </div>
      )}

      {!state.credential ? (
        <div className=" gap-4 flex-col text-black">
          <input
            type="text"
            placeholder="Enter username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded-xl py-2 pl-3 text-sm pr-10 border mb-2 focus:outline-none focus:ring-2 focus:ring-[#D7E96D]"
          />
          <button
            onClick={() => registerNewAccount(username)}
            disabled={state.isRegistering}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded-xl hover:bg-blue-600 disabled:bg-blue-300"
          >
            {state.isRegistering ? "Registering..." : "Register New Wallet"}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="break-all">
            <h3 className="text-sm font-semibold">Wallet Address:</h3>
            <p className="text-gray-600">{state.accountAddress}</p>
          </div>

          <button
            onClick={() => signMessage("Hello World")}
            className="w-full bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600"
          >
            Sign Test Message
          </button>

          <button
            onClick={() => {
              localStorage.clear();
              setState({
                credential: null,
                accountAddress: null,
                isRegistering: false,
                error: null,
              });
            }}
            className="w-full bg-red-500 text-white py-2 px-4 rounded hover:bg-red-600"
          >
            Reset Wallet
          </button>
        </div>
      )}
    </div>
  );
}
