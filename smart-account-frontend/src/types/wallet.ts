export interface WebAuthnCredential {
    id: string;
    publicKey: {
      x: bigint;
      y: bigint;
    };
    rawId: Uint8Array;
  }
  
  export interface SessionKey {
    address: string;
    validUntil: number;
    privateKey: string;
  }