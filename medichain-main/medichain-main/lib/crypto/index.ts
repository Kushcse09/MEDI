/**
 * MediChain Shield - Cryptographic Engine
 * 
 * Main export file for the zero-knowledge cryptographic module.
 * Provides all primitives needed for client-side encryption:
 * 
 * - Key derivation from wallet signatures (HKDF + X25519)
 * - Record encryption (AES-256-GCM with AAD binding)
 * - Key wrapping (libsodium crypto_box_seal)
 * - Secure memory management
 * 
 * Security properties:
 * - Zero-knowledge: server never sees plaintext or keys
 * - Authenticated encryption: tampering detection
 * - Forward secrecy: ephemeral keys for wrapping
 * - Memory safety: automatic key wiping
 */

// Key Derivation
export {
  deriveX25519KeyPair,
  generateKeyDerivationMessage,
  isValidX25519PublicKey,
  keyToHex,
  hexToKey,
  zeroize,
  SecureKeyPair,
  type X25519KeyPair,
} from './keyDerivation';

// AES-GCM Encryption
export {
  encryptRecord,
  decryptRecord,
  encryptText,
  decryptText,
  generateRecordKey,
  generateIV,
  sha256,
  sha256Hex,
  TamperDetectedError,
  type EncryptedRecord,
} from './aesGcm';

// Key Wrapping
export {
  wrapKey,
  unwrapKey,
  wrapKeyForMultiple,
  wrappedKeyToBase64,
  base64ToWrappedKey,
  getSealedSize,
  isValidSealedKeySize,
} from './keyWrap';

/**
 * Complete encryption flow for a new record
 * 
 * @param plaintext - Record data to encrypt
 * @param recordId - Unique record identifier
 * @param recipientPublicKeys - Public keys of authorized recipients
 * @returns Encrypted record with wrapped keys for each recipient
 */
export async function encryptRecordForRecipients(
  plaintext: Uint8Array,
  recordId: string,
  recipientPublicKeys: Uint8Array[]
) {
  const { encryptRecord } = await import('./aesGcm');
  const { wrapKeyForMultiple } = await import('./keyWrap');
  const { zeroize: zeroizeKey } = await import('./keyDerivation');

  // Encrypt the record
  const encrypted = await encryptRecord(plaintext, recordId);

  // Wrap the key for all recipients
  const wrappedKeys = await wrapKeyForMultiple(encrypted.recordKey, recipientPublicKeys);

  // Zeroize the unwrapped key
  zeroizeKey(encrypted.recordKey);

  return {
    ciphertext: encrypted.ciphertext,
    iv: encrypted.iv,
    wrappedKeys,
  };
}

/**
 * Complete decryption flow for accessing a shared record
 * 
 * @param ciphertext - Encrypted record data
 * @param iv - Initialization vector
 * @param wrappedKey - Sealed key wrapped for this recipient
 * @param recipientPublicKey - Recipient's public key
 * @param recipientPrivateKey - Recipient's private key
 * @param recordId - Record identifier (for AAD verification)
 * @returns Decrypted plaintext
 */
export async function decryptSharedRecord(
  ciphertext: Uint8Array,
  iv: Uint8Array,
  wrappedKey: Uint8Array,
  recipientPublicKey: Uint8Array,
  recipientPrivateKey: Uint8Array,
  recordId: string
): Promise<Uint8Array> {
  const { decryptRecord } = await import('./aesGcm');
  const { unwrapKey } = await import('./keyWrap');
  const { zeroize: zeroizeKey } = await import('./keyDerivation');

  // Unwrap the record key
  const recordKey = await unwrapKey(wrappedKey, recipientPublicKey, recipientPrivateKey);

  try {
    // Decrypt the record
    const plaintext = await decryptRecord(ciphertext, iv, recordKey, recordId);
    return plaintext;
  } finally {
    // Always zeroize the unwrapped key
    zeroizeKey(recordKey);
  }
}

/**
 * Version information
 */
export const SHIELD_CRYPTO_VERSION = '1.0.0';
export const SHIELD_CRYPTO_ALGORITHMS = {
  keyDerivation: 'HKDF-SHA256',
  asymmetric: 'X25519-XSalsa20-Poly1305',
  symmetric: 'AES-256-GCM',
} as const;
