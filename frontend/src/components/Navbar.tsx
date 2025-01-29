"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/context/WalletContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { formatEther } from "viem";
import Link from "next/link";
import { toast } from "sonner";
import { Copy } from "lucide-react";
import { ModeToggle } from "./ThemeToggle";

export default function Navbar() {
  const {
    accountAddress,
    credential,
    sessionKey,
    createSessionKey,
    deleteSessionKey,
    logout,
    client,
  } = useWallet();
  const [balance, setBalance] = useState<string>("0");

  useEffect(() => {
    const fetchBalance = async () => {
      if (accountAddress) {
        const balance = await client.getBalance({ address: accountAddress });
        setBalance(formatEther(balance));
      }
    };

    fetchBalance();
    // fetches balance every 30 seconds
    const interval = setInterval(fetchBalance, 30000);

    return () => clearInterval(interval);
  }, [accountAddress, client]);

  const truncateAddress = (address: string) => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const copyToClipboard = async () => {
    if (accountAddress) {
      await navigator.clipboard.writeText(accountAddress);
      toast.success("Address copied to clipboard");
    }
  };

  return (
    <nav className="border-b fixed top-0 left-0 right-0 z-10">
      <div className="flex h-16 items-center px-6">
        <div className="flex items-center space-x-4">
          <Link href="/">
            <span className="text-2xl font-sans font-semibold">
              SMART ACCOUNT
            </span>
          </Link>
        </div>

        <div className="ml-auto flex items-center space-x-4">
          <ModeToggle />
          {!credential ? (
            <Link href="/auth">
              <Button className="w-24">Login</Button>
            </Link>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-48">
                  <span className="truncate">{balance} ETH</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-48">
                <DropdownMenuLabel>Wallet</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="flex justify-between items-center cursor-pointer"
                  onClick={copyToClipboard}
                >
                  <span>{truncateAddress(accountAddress || "")}</span>
                  <Copy className="h-4 w-4" />
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {!sessionKey && (
                  <DropdownMenuItem>
                    <Button onClick={createSessionKey} className=" w-full">
                      Create Session Key
                    </Button>
                  </DropdownMenuItem>
                )}
                {sessionKey && (
                  <DropdownMenuItem>
                    <Button onClick={deleteSessionKey} className=" w-full">
                      Delete Session Key
                    </Button>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem>
                  <Button
                    onClick={logout}
                    variant={"secondary"}
                    className=" w-full"
                  >
                    Lougout
                  </Button>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </nav>
  );
}
