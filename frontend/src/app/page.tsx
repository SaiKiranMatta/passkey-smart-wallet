"use client"
import { useWallet } from "@/context/WalletContext";
import TransactionForm from "@/components/TransactionForm";

export default function HomePage() {
  const { credential } = useWallet();

  return (
    <div className="container mx-auto px-4 py-8">
      {!credential ? (
        <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-4">
          <h1 className="text-6xl font-bold text-center">
            Next Generation Blockchain Accounts
          </h1>
          <p className="text-xl text-center text-gray-600 max-w-2xl">
            Experience the future of Web3 with our innovative smart contract wallet solution.
            Built with security and user experience in mind.
          </p>
        </div>
      ) : (
        <div className="max-w-2xl mx-auto">
          <TransactionForm />
        </div>
      )}
    </div>
  );
}