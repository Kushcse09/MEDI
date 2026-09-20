/**
 * MediChain Shield - Key Wrapping Module
 * 
 * Provides authenticated asymmetric key wrapping using libsodium's crypto_box_seal.
 * Enables secure key distribution: record owner wraps AES keys for recipients.
 * 
 * Security guarantees:
 * - X25519-XSalsa20-Poly1305 authenticated encryption (libsodium)
 * - Anonymous encryption (no sender authentication, only recipient verification)
 * - Ephemeral sender keypair per wrapping operation
 * - Audited implementation (libsodium WASM)
 */

import sodium from 'libsodium-wrappers';

/**
 * Wraps (encrypts) a record key for a specific recipient using their public key
 * 
 * Uses crypto_box_seal which:
 * - Generates ephemeral keypair
 * - Encrypts with X25519-XSalsa20-Poly1305
 * - Authenticates ciphertext with Poly1305 MAC
 * - Only recipient's private key can unwrap
 * 
 * @param recordKey - AES key to wrap (typically 32 bytes)
 * @param recipientPublicKey - Recipient's X25519 public key (32 bytes)
 * @returns Sealed ciphertext (ephemeral public key + encrypted key + auth tag)
 * 
 * @throws Error if wrapping fails or keys are invalid
 */
export async function wrapKey(
  recordKey: Uint8Array,
  recipientPublicKey: Uint8Array
): Promise<Uint8Array> {
  await sodium.ready;

  if (!recordKey || recordKey.length === 0) {
    throw new Error('Record key cannot be empty');
  }

  if (!recipientPublicKey || recipientPublicKey.length !== sodium.crypto_box_PUBLICKEYBYTES) {
    throw new Error(
      `Invalid recipient public key: expected ${sodium.crypto_box_PUBLICKEYBYTES} bytes, got ${recipientPublicKey?.length || 0}`
    );
  }

  try {
    // crypto_box_seal: anonymous authenticated encryption
    // Output includes ephemeral public key + ciphertext + auth tag
    const sealed = sodium.crypto_box_seal(recordKey, recipientPublicKey);
    return sealed;
  } catch (error) {
    throw new Error(`Key wrapping failed: ${error instanceof Error ? error.message : 'unknown error'}`);
  }
}

/**
 * Unwraps (decrypts) a sealed record key using recipient's keypair
 * 
 * @param sealedKey - Sealed ciphertext from wrapKey
 * @param recipientPublicKey - Recipient's X25519 public key (32 bytes)
 * @param recipientPrivateKey - Recipient's X25519 private key (32 bytes)
 * @returns Unwrapped record key
 * 
 * @throws Error if unwrapping fails (wrong key, tampered ciphertext, or invalid keys)
 */
export async function unwrapKey(
  sealedKey: Uint8Array,
  recipientPublicKey: Uint8Array,
  recipientPrivateKey: Uint8Array
): Promise<Uint8Array> {
  await sodium.ready;

  if (!sealedKey || sealedKey.length === 0) {
    throw new Error('Sealed key cannot be empty');
  }

  if (!recipientPublicKey || recipientPublicKey.length !== sodium.crypto_box_PUBLICKEYBYTES) {
    throw new Error(
      `Invalid recipient public key: expected ${sodium.crypto_box_PUBLICKEYBYTES} bytes, got ${recipientPublicKey?.length || 0}`
    );
  }

  if (!recipientPrivateKey || recipientPrivateKey.length !== sodium.crypto_box_SECRETKEYBYTES) {
    throw new Error(
      `Invalid recipient private key: expected ${sodium.crypto_box_SECRETKEYBYTES} bytes, got ${recipientPrivateKey?.length || 0}`
    );
  }

  try {
    // crypto_box_seal_open: authenticated decryption
    // Verifies ephemeral public key and auth tag
    const unwrapped = sodium.crypto_box_seal_open(
      sealedKey,
      recipientPublicKey,
      recipientPrivateKey
    );
    return unwrapped;
  } catch (error) {
    throw new Error(
      `Key unwrapping failed: ${error instanceof Error ? error.message : 'wrong key or tampered ciphertext'}`
    );
  }
}

/**
 * Wraps multiple keys for multiple recipients
 * Convenience function for batch operations
 * 
 * @param recordKey - AES key to wrap
 * @param recipientPublicKeys - Array of recipient public keys
 * @returns Array of wrapped keys in same order as recipients
 */
export async function wrapKeyForMultiple(
  recordKey: Uint8Array,
  recipientPublicKeys: Uint8Array[]
): Promise<Uint8Array[]> {
  const wrapped: Uint8Array[] = [];

  for (const publicKey of recipientPublicKeys) {
    const sealedKey = await wrapKey(recordKey, publicKey);
    wrapped.push(sealedKey);
  }

  return wrapped;
}

/**
 * Converts wrapped key to base64 for storage/transmission
 * 
 * @param wrappedKey - Wrapped key bytes
 * @returns Base64 string
 */
export function wrappedKeyToBase64(wrappedKey: Uint8Array): string {
  return btoa(String.fromCharCode(...wrappedKey));
}

/**
 * Converts base64 wrapped key back to bytes
 * 
 * @param base64 - Base64 string
 * @returns Wrapped key bytes
 */
export function base64ToWrappedKey(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Gets the expected size of a sealed key
 * Sealed size = ephemeral_pk (32) + ciphertext (key_size) + mac (16)
 * 
 * @param keySize - Original key size in bytes
 * @returns Expected sealed size
 */
export function getSealedSize(keySize: number): number {
  return sodium.crypto_box_SEALBYTES + keySize;
}

/**
 * Validates that a sealed key has plausible size
 * 
 * @param sealedKey - Sealed key to validate
 * @param expectedKeySize - Expected original key size (optional)
 * @returns true if size is valid
 */
export function isValidSealedKeySize(
  sealedKey: Uint8Array,
  expectedKeySize?: number
): boolean {
  if (!sealedKey || sealedKey.length < sodium.crypto_box_SEALBYTES) {
    return false;
  }

  if (expectedKeySize !== undefined) {
    return sealedKey.length === getSealedSize(expectedKeySize);
  }

  return true;
}
