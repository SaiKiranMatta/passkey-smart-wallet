export class EncryptedStorage {
    private dbName = 'walletStorage';
    private storeName = 'sessionKeys';
    private encryptionKey: CryptoKey | null = null;
  
    private async initializeDB(): Promise<IDBDatabase> {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(this.dbName, 1);
  
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
  
        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(this.storeName)) {
            db.createObjectStore(this.storeName);
          }
        };
      });
    }
  
    private async getEncryptionKey(): Promise<CryptoKey> {
      if (this.encryptionKey) return this.encryptionKey;
  
      // Derive an encryption key from the user's credential
      const encoder = new TextEncoder();
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(window.location.host), // Use domain as key material
        { name: 'PBKDF2' },
        false,
        ['deriveBits', 'deriveKey']
      );
  
      this.encryptionKey = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: encoder.encode('walletSessionKey'),
          iterations: 100000,
          hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );
  
      return this.encryptionKey;
    }
  
    private async encrypt(data: any): Promise<ArrayBuffer> {
      const key = await this.getEncryptionKey();
      const encoder = new TextEncoder();
      const iv = crypto.getRandomValues(new Uint8Array(12));
      
      const encryptedData = await crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv
        },
        key,
        encoder.encode(JSON.stringify(data))
      );
  
      const result = new Uint8Array(iv.length + encryptedData.byteLength);
      result.set(iv);
      result.set(new Uint8Array(encryptedData), iv.length);
      
      return result.buffer;
    }
  
    private async decrypt(data: ArrayBuffer): Promise<any> {
      const key = await this.getEncryptionKey();
      const iv = new Uint8Array(data.slice(0, 12));
      const encryptedData = new Uint8Array(data.slice(12));
  
      const decryptedData = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv
        },
        key,
        encryptedData
      );
  
      const decoder = new TextDecoder();
      return JSON.parse(decoder.decode(decryptedData));
    }
  
    async store(key: string, value: any): Promise<void> {
      const db = await this.initializeDB();
      const encrypted = await this.encrypt(value);
  
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(this.storeName, 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.put(encrypted, key);
  
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    }
  
    async retrieve(key: string): Promise<any> {
      const db = await this.initializeDB();
  
      return new Promise(async (resolve, reject) => {
        const transaction = db.transaction(this.storeName, 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.get(key);
  
        request.onerror = () => reject(request.error);
        request.onsuccess = async () => {
          if (!request.result) {
            resolve(null);
            return;
          }
          
          try {
            const decrypted = await this.decrypt(request.result);
            resolve(decrypted);
          } catch (error) {
            reject(error);
          }
        };
      });
    }
  
    async remove(key: string): Promise<void> {
      const db = await this.initializeDB();
  
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(this.storeName, 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.delete(key);
  
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    }
  }
  
  export const encryptedStorage = new EncryptedStorage();