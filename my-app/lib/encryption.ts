// Encryption utilities using Web Crypto API

export interface KeyPair {
    publicKey: CryptoKey;
    privateKey: CryptoKey;
}

export interface SerializedPublicKey {
    key: string; // base64 encoded
}

// Generate ECDH key pair for key exchange
export async function generateKeyPair(): Promise<KeyPair> {
    const keyPair = await window.crypto.subtle.generateKey(
        {
            name: "ECDH",
            namedCurve: "P-256"
        },
        true,
        ["deriveKey", "deriveBits"]
    );
    return keyPair as KeyPair;
}

// Export public key to base64 string
export async function exportPublicKey(publicKey: CryptoKey): Promise<string> {
    const exported = await window.crypto.subtle.exportKey("spki", publicKey);
    return btoa(String.fromCharCode(...new Uint8Array(exported)));
}

// Import public key from base64 string
export async function importPublicKey(base64Key: string): Promise<CryptoKey> {
    const binaryString = atob(base64Key);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }

    return await window.crypto.subtle.importKey(
        "spki",
        bytes,
        {
            name: "ECDH",
            namedCurve: "P-256"
        },
        true,
        []
    );
}

// Derive shared AES key from ECDH
export async function deriveSharedSecret(
    privateKey: CryptoKey,
    publicKey: CryptoKey
): Promise<CryptoKey> {
    return await window.crypto.subtle.deriveKey(
        {
            name: "ECDH",
            public: publicKey
        },
        privateKey,
        {
            name: "AES-GCM",
            length: 256
        },
        false,
        ["encrypt", "decrypt"]
    );
}

// Encrypt data with AES-GCM
export async function encrypt(data: string, key: CryptoKey): Promise<string> {
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(data);

    const encrypted = await window.crypto.subtle.encrypt(
        {
            name: "AES-GCM",
            iv: iv
        },
        key,
        encoded
    );

    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encrypted), iv.length);

    return btoa(String.fromCharCode(...combined));
}

// Decrypt data with AES-GCM
export async function decrypt(encryptedData: string, key: CryptoKey): Promise<string> {
    const binaryString = atob(encryptedData);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }

    // Extract IV and encrypted data
    const iv = bytes.slice(0, 12);
    const data = bytes.slice(12);

    const decrypted = await window.crypto.subtle.decrypt(
        {
            name: "AES-GCM",
            iv: iv
        },
        key,
        data
    );

    return new TextDecoder().decode(decrypted);
}

// Encrypt binary data (for files)
export async function encryptBinary(data: ArrayBuffer, key: CryptoKey): Promise<ArrayBuffer> {
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    const encrypted = await window.crypto.subtle.encrypt(
        {
            name: "AES-GCM",
            iv: iv
        },
        key,
        data
    );

    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encrypted), iv.length);

    return combined.buffer;
}

// Decrypt binary data (for files)
export async function decryptBinary(encryptedData: ArrayBuffer, key: CryptoKey): Promise<ArrayBuffer> {
    const bytes = new Uint8Array(encryptedData);

    // Extract IV and encrypted data
    const iv = bytes.slice(0, 12);
    const data = bytes.slice(12);

    return await window.crypto.subtle.decrypt(
        {
            name: "AES-GCM",
            iv: iv
        },
        key,
        data
    );
}
