"use client"

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/context/WalletContext";
import { login, registerNewAccount } from "@/utils/auth";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function AuthPage() {
  const router = useRouter();
  const { initializeWallet, isLoading, error } = useWallet();
  const [isLoginMode, setIsLoginMode] = useState(false);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");

  const handleLogin = async () => {
    try {
      await login(email, initializeWallet);
      router.push('/');
    } catch (error) {
      console.error(error);
    }
  };

  const handleRegister = async () => {
    try {
      await registerNewAccount(email, username, initializeWallet);
      router.push('/');
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
      <Card className=" w-[32rem] ">
        <CardHeader>
          <CardTitle>{isLoginMode ? "Login" : "Register"}</CardTitle>
          <CardDescription>
            {isLoginMode 
              ? "Sign in to your account" 
              : "Create a new web3 account"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-4">
            <Input
              type="email"
              placeholder="Enter email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            {!isLoginMode && (
              <Input
                type="text"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            )}

            <Button
              className="w-full"
              onClick={isLoginMode ? handleLogin : handleRegister}
              disabled={isLoading}
            >
              {isLoading
                ? "Processing..."
                : isLoginMode
                ? "Login"
                : "Register New Wallet"}
            </Button>

            <Button
              variant="ghost"
              className="w-full"
              onClick={() => setIsLoginMode(!isLoginMode)}
            >
              {isLoginMode 
                ? "Don't have an account? Register" 
                : "Already have an account? Login"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}