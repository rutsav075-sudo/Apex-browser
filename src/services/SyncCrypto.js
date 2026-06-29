/**
 * SyncCrypto — Client-side AES-256-GCM encryption for sensitive data
 * Uses Web Crypto API (zero dependencies)
 * Passwords are NEVER stored in plaintext in Firebase.
 */

const PBKDF2_ITERATIONS = 100000;
const SALT_PREFIX = 'apex-sync-v1-';

/**
 * Derive an AES-256 key from the user's Google UID
 */
async function deriveKey(userId) {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(userId),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode(SALT_PREFIX + userId),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt data with AES-256-GCM
 * @param {string} plaintext - JSON string to encrypt
 * @param {string} userId - Google UID used as key derivation input
 * @returns {string} Base64-encoded ciphertext (IV prepended)
 */
export async function encrypt(plaintext, userId) {
  const key = await deriveKey(userId);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoder = new TextEncoder();

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(plaintext)
  );

  // Prepend IV to ciphertext for storage
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);

  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt data with AES-256-GCM
 * @param {string} ciphertextB64 - Base64-encoded ciphertext (IV prepended)
 * @param {string} userId - Google UID
 * @returns {string} Decrypted plaintext
 */
export async function decrypt(ciphertextB64, userId) {
  const key = await deriveKey(userId);
  const combined = Uint8Array.from(atob(ciphertextB64), c => c.charCodeAt(0));

  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );

  return new TextDecoder().decode(decrypted);
}
