"use client";

import { useState, useEffect } from "react";
import { WebAuthnP256 } from "ox";
import { createPublicClient, http } from "viem";
import { foundry } from "viem/chains";
import {
  createWebAuthnCredential,
  CreateWebAuthnCredentialReturnType,
} from "viem/account-abstraction";
import { toWebAuthnAccount } from "viem/account-abstraction";
import { toGardenSmartAccount } from "@/utils/toGardenSmartAccount";
import {parsePublicKey} from "webauthn-p256";

interface WalletState {
  credential: CreateWebAuthnCredentialReturnType | null;
  accountAddress: string | null;
  isLoading: boolean;
  error: string | null;
}

interface StoredCredential {
  email: string;
  credential: CreateWebAuthnCredentialReturnType;
  accountAddress: string;
}

export default function WebAuthnWallet() {
  const [state, setState] = useState<WalletState>({
    credential: null,
    accountAddress: null,
    isLoading: false,
    error: null,
  });

  const [isLoginMode, setIsLoginMode] = useState(false);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");

  const client = createPublicClient({
    chain: foundry,
    transport: http("http://localhost:8545"),
  });

  useEffect(() => {
    // Load stored credential from localStorage for the current session
    const currentSession = localStorage.getItem("current_session");
    if (currentSession) {
      const { credential, accountAddress } = JSON.parse(currentSession);
      setState((prev) => ({
        ...prev,
        credential,
        accountAddress,
      }));
    }
  }, []);

  const storeCredential = (
    email: string,
    credential: CreateWebAuthnCredentialReturnType,
    accountAddress: string
  ) => {
    // Store in local storage for persistence
    const storedCredentials = JSON.parse(
      localStorage.getItem("stored_credentials") || "[]"
    );
    const newCredential: StoredCredential = {
      email,
      credential,
      accountAddress,
    };

    // Check if email already exists and update if it does
    const existingIndex = storedCredentials.findIndex(
      (c: StoredCredential) => c.email === email
    );
    if (existingIndex >= 0) {
      storedCredentials[existingIndex] = newCredential;
    } else {
      storedCredentials.push(newCredential);
    }

    localStorage.setItem(
      "stored_credentials",
      JSON.stringify(storedCredentials)
    );

    // Store current session
    localStorage.setItem(
      "current_session",
      JSON.stringify({ credential, accountAddress })
    );
  };

  const registerNewAccount = async () => {
    if (!email || !username) {
      setState((prev) => ({
        ...prev,
        error: "Both email and username are required",
      }));
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const credential = await createWebAuthnCredential({
        name: username,
      });

      const account = toWebAuthnAccount({
        credential,
      });

      const smartAccount = await toGardenSmartAccount({
        client,
        owner: account,
      });

      // Store credentials with email
      storeCredential(email, credential, smartAccount.address);

      setState((prev) => ({
        ...prev,
        credential,
        accountAddress: smartAccount.address,
        isLoading: false,
      }));
    } catch (error) {
      console.error("Registration failed:", error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Registration failed",
      }));
    }
  };

  const login = async () => {
    if (!email) {
      setState((prev) => ({ ...prev, error: "Email is required" }));
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // Get stored credential for this email
      const storedCredentials: StoredCredential[] = JSON.parse(
        localStorage.getItem("stored_credentials") || "[]"
      );
      const storedCredential = storedCredentials.find((c) => c.email === email);

      if (!storedCredential) {
        throw new Error("No account found for this email");
      }

      // Verify the credential
      const { metadata, signature } = await WebAuthnP256.sign({
        credentialId: storedCredential.credential.id,
        challenge: `0x${Buffer.from("login-verification").toString(
          "hex"
        )}` as `0x${string}`,
      });


      const verified = await WebAuthnP256.verify({
        metadata,
        challenge: `0x${Buffer.from("login-verification").toString('hex')}` as `0x${string}`,
        publicKey: {
          ...parsePublicKey(storedCredential.credential.publicKey),
          prefix: parsePublicKey(storedCredential.credential.publicKey).prefix || 0x04,
        },
        signature,
      });

      if (!verified) {
        throw new Error("Authentication failed");
      }

      // Create account instance
      const account = toWebAuthnAccount({
        credential: storedCredential.credential,
      });

      const smartAccount = await toGardenSmartAccount({
        client,
        owner: account,
      });

      console.log("login address", smartAccount.address)

      // Store current session
      localStorage.setItem(
        "current_session",
        JSON.stringify({
          credential: storedCredential.credential,
          accountAddress: smartAccount.address,
        })
      );

      setState((prev) => ({
        ...prev,
        credential: storedCredential.credential,
        accountAddress: smartAccount.address,
        isLoading: false,
      }));
    } catch (error) {
      console.error("Login failed:", error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Login failed",
      }));
    }
  };

  const signMessage = async (message: string) => {
    if (!state.credential) return;

    try {
      const { metadata, signature } = await WebAuthnP256.sign({
        credentialId: state.credential.id,
        challenge: `0x${Buffer.from(message).toString("hex")}` as `0x${string}`,
      });

      console.log(signature)

      const verified = await WebAuthnP256.verify({
        metadata,
        challenge: `0x${Buffer.from(message).toString('hex')}` as `0x${string}`,
        publicKey: {
          ...parsePublicKey(state.credential.publicKey),
          prefix: parsePublicKey(state.credential.publicKey).prefix || 0x04,
        },
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

  return (
    <div className="p-6 mx-auto bg-white rounded-xl shadow-md flex flex-col items-center justify-center min-h-screen">
      {state.error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
          {state.error}
        </div>
      )}

      {!state.credential ? (
        <div className="gap-4 flex-col text-black">
          <div className="mb-4">
            <button
              onClick={() => setIsLoginMode(!isLoginMode)}
              className="text-blue-500 underline mb-2"
            >
              Switch to {isLoginMode ? "Register" : "Login"}
            </button>
          </div>

          <input
            type="email"
            placeholder="Enter email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl py-2 pl-3 text-sm pr-10 border mb-2 focus:outline-none focus:ring-2 focus:ring-[#D7E96D]"
          />

          {!isLoginMode && (
            <input
              type="text"
              placeholder="Enter username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-xl py-2 pl-3 text-sm pr-10 border mb-2 focus:outline-none focus:ring-2 focus:ring-[#D7E96D]"
            />
          )}

          <button
            onClick={isLoginMode ? login : registerNewAccount}
            disabled={state.isLoading}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded-xl hover:bg-blue-600 disabled:bg-blue-300"
          >
            {state.isLoading
              ? "Processing..."
              : isLoginMode
              ? "Login"
              : "Register New Wallet"}
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
              localStorage.removeItem("current_session");
              setState({
                credential: null,
                accountAddress: null,
                isLoading: false,
                error: null,
              });
            }}
            className="w-full bg-red-500 text-white py-2 px-4 rounded hover:bg-red-600"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
