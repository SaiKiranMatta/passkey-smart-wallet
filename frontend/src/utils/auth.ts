import {
  createWebAuthnCredential,
  CreateWebAuthnCredentialReturnType,
} from "viem/account-abstraction";

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

export const registerNewAccount = async (
  email: string,
  username: string,
  initializeWallet: any
) => {
  if (!email || !username) {
    return;
  }

  try {
    const credential = await createWebAuthnCredential({
      name: username,
    });

    storeCredential(email, credential);

    await initializeWallet(email, credential);
  } catch (error) {
    console.error("Registration failed:", error);
  }
};

export const login = async (email: string, initializeWallet: any) => {
  if (!email) return;

  try {
    const response = await fetch(`${backendUrl}/credentials/${email}`);
    if (!response.ok) {
      throw new Error("No account found for this email");
    }

    const storedCredential = await response.json();
    await initializeWallet(email, storedCredential.credential);
  } catch (error) {
    console.error("Login failed:", error);
  }
};

interface StoredCredential {
  email: string;
  credential: CreateWebAuthnCredentialReturnType;
  accountAddress: string;
}

export const storeCredential = async (
  email: string,
  credential: CreateWebAuthnCredentialReturnType
) => {
  try {
    const response = await fetch(`${backendUrl}/credentials`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        credential,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to store credential");
    }

    localStorage.setItem(
      "current_session",
      JSON.stringify({ email, credential })
    );
  } catch (error) {
    console.error("Failed to store credential:", error);
    throw error;
  }
};
