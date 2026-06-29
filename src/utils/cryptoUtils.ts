/**
 * Utility for symmetric encryption using WebCrypto API (AES-256-GCM)
 * Completely dependency-free and compatible with Node.js crypto wrapper on the backend.
 */

const PBKDF2_ITERATIONS = 100000;
const KEY_LENGTH = 256; // bits

/**
 * Derives a CryptoKey from a passphrase string using PBKDF2
 */
async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
        'raw', 
        enc.encode(passphrase).buffer as BufferSource, 
        { name: 'PBKDF2' }, 
        false, 
        ['deriveBits', 'deriveKey']
    );

    return window.crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: salt.buffer as BufferSource,
            iterations: PBKDF2_ITERATIONS,
            hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: KEY_LENGTH },
        false,
        ['encrypt', 'decrypt']
    );
}

/**
 * Encrypts a JSON object into a Base64 string safely transportable to Cloud Functions.
 * Appends SALT and IV to the final Base64 so the server can reconstruct.
 */
export async function encryptPayload(payload: any, passphrase: string = (import.meta as any).env?.VITE_ENCRYPTION_KEY || 'default_secure_key_123'): Promise<string> {
    const enc = new TextEncoder();
    const dataBuffer = enc.encode(JSON.stringify(payload));

    // Generate random Salt (16 bytes) and IV (12 bytes for GCM)
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    const key = await deriveKey(passphrase, salt);

    // Encrypt
    const encryptedBuffer = await window.crypto.subtle.encrypt(
        {
            name: 'AES-GCM',
            iv: iv
        },
        key,
        dataBuffer.buffer as BufferSource
    );

    // Concat: Salt (16) + IV (12) + Ciphertext/AuthTag
    const combined = new Uint8Array(salt.length + iv.length + encryptedBuffer.byteLength);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(encryptedBuffer), salt.length + iv.length);

    // Convert to Base64 safely
    let binary = '';
    const chunk = 8192;
    for (let i = 0; i < combined.length; i += chunk) {
        binary += String.fromCharCode.apply(null, combined.subarray(i, i + chunk) as unknown as number[]);
    }
    return btoa(binary);
}
