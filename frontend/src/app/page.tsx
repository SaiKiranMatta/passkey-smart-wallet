"use client";

import { useState } from "react";
import { createWebAuthnCredential } from "viem/account-abstraction";
import { useWallet } from "@/context/WalletContext";

export default function WebAuthnWallet() {
  const {
    accountAddress,
    credential,
    isLoading,
    error,
    sessionKey,
    initializeWallet,
    createSessionKey,
    signMessage,
    logout
  } = useWallet();

  const [isLoginMode, setIsLoginMode] = useState(false);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");

  const registerNewAccount = async () => {
    if (!email || !username) {
      return;
    }

    try {
      const credential = await createWebAuthnCredential({
        name: username,
      });

      await initializeWallet(email, credential);
    } catch (error) {
      console.error("Registration failed:", error);
    }
  };

  const login = async () => {
    if (!email) return;

    try {
      const storedCredentials = JSON.parse(
        localStorage.getItem("stored_credentials") || "[]"
      );
      const storedCredential = storedCredentials.find(
        (c: any) => c.email === email
      );

      if (!storedCredential) {
        throw new Error("No account found for this email");
      }

      await initializeWallet(email, storedCredential.credential);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  return (
    <div className="p-6 mx-auto bg-white rounded-xl shadow-md flex flex-col items-center justify-center min-h-screen">
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      {!credential ? (
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
            disabled={isLoading}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded-xl hover:bg-blue-600 disabled:bg-blue-300"
          >
            {isLoading
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
            <p className="text-gray-600">{accountAddress}</p>
          </div>

          {!sessionKey && (
            <button
              onClick={createSessionKey}
              className="w-full bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600"
            >
              Create Session Key
            </button>
          )}

          <button
            onClick={() => signMessage("Hello World")}
            className="w-full bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600"
          >
            Sign Test Message
          </button>

          <button
            onClick={logout}
            className="w-full bg-red-500 text-white py-2 px-4 rounded hover:bg-red-600"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}