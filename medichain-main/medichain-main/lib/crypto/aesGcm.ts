/**
 * MediChain Shield - AES-GCM Encryption Module
 * 
 * Provides authenticated encryption for medical records using AES-256-GCM.
 * Binds record ID as Additional Authenticated Data (AAD) to prevent ciphertext replay attacks.
 * 
 * Security guarantees:
 * - AES-256-GCM authenticated encryption (NIST approved)
 * - Unique 96-bit IV per encryption (collision probability < 2^-64 for 2^32 encryptions)
 * - AAD binding prevents cross-record ciphertext replay
 * - Authentication tag verification detects tampering
 */

/**
 * Custom error for tamper detection
 */
export class TamperDetectedError extends Error {
  constructor(message: string = 'Data tampering detected: authentication failed') {
    super(message);
    this.name = 'TamperDetectedError';
  }
}

/**
 * Encrypted record structure
 */
export interface EncryptedRecord {
  ciphertext: Uint8Array;
  iv: Uint8Array;
  recordKey: Uint8Array;
}

/**
 * Generates a cryptographically secure random AES-256 key
 * @returns 256-bit (32 byte) AES key
 */
export function generateRecordKey(): Uint8Array {
  const key = new Uint8Array(32); // 256 bits
  crypto.getRandomValues(key);
  return key;
}

/**
 * Generates a unique initialization vector (IV) for AES-GCM
 * @returns 96-bit (12 byte) IV
 */
export function generateIV(): Uint8Array {
  const iv = new Uint8Array(12); // 96 bits (recommended for GCM)
  crypto.getRandomValues(iv);
  return iv;
}

/**
 * Encrypts plaintext with AES-256-GCM, binding the record ID as AAD
 * 
 * @param plaintext - Data to encrypt
 * @param recordId - Record identifier (bound as AAD to prevent replay)
 * @returns Encrypted record with ciphertext, IV, and key
 * 
 * @throws Error if encryption fails
 */
export async function encryptRecord(
  plaintext: Uint8Array,
  recordId: string
): Promise<EncryptedRecord> {
  if (!plaintext || plaintext.length === 0) {
    throw new Error('Plaintext cannot be empty');
  }

  if (!recordId || recordId.trim().length === 0) {
    throw new Error('Record ID cannot be empty');
  }

  // Generate random key and IV
  const recordKey = generateRecordKey();
  const iv = generateIV();

  try {
    // Import the key for AES-GCM
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      recordKey,
      { name: 'AES-GCM' },
      false, // not extractable
      ['encrypt']
    );

    // Encode record ID as AAD
    const aad = new TextEncoder().encode(recordId);

    // Encrypt with AAD binding
    const ciphertext = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
        additionalData: aad,
        tagLength: 128, // 128-bit authentication tag
      },
      cryptoKey,
      plaintext
    );

    return {
      ciphertext: new Uint8Array(ciphertext),
      iv: iv,
      recordKey: recordKey,
    };
  } catch (error) {
    throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'unknown error'}`);
  }
}

/**
 * Decrypts ciphertext with AES-256-GCM, verifying the record ID AAD
 * 
 * @param ciphertext - Encrypted data (includes auth tag)
 * @param iv - Initialization vector used during encryption
 * @param recordKey - AES key used during encryption
 * @param recordId - Record identifier (must match AAD from encryption)
 * @returns Decrypted plaintext
 * 
 * @throws TamperDetectedError if authentication fails or AAD mismatch
 * @throws Error if decryption fails for other reasons
 */
export async function decryptRecord(
  ciphertext: Uint8Array,
  iv: Uint8Array,
  recordKey: Uint8Array,
  recordId: string
): Promise<Uint8Array> {
  if (!ciphertext || ciphertext.length === 0) {
    throw new Error('Ciphertext cannot be empty');
  }

  if (!iv || iv.length !== 12) {
    throw new Error('Invalid IV: must be 12 bytes');
  }

  if (!recordKey || recordKey.length !== 32) {
    throw new Error('Invalid key: must be 32 bytes');
  }

  if (!recordId || recordId.trim().length === 0) {
    throw new Error('Record ID cannot be empty');
  }

  try {
    // Import the key for AES-GCM
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      recordKey,
      { name: 'AES-GCM' },
      false, // not extractable
      ['decrypt']
    );

    // Encode record ID as AAD
    const aad = new TextEncoder().encode(recordId);

    // Decrypt with AAD verification
    const plaintext = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
        additionalData: aad,
        tagLength: 128,
      },
      cryptoKey,
      ciphertext
    );

    return new Uint8Array(plaintext);
  } catch (error) {
    // WebCrypto throws generic errors, but auth failures are most common
    if (error instanceof Error && error.name === 'OperationError') {
      throw new TamperDetectedError(
        'Authentication failed: ciphertext modified or wrong key/AAD'
      );
    }
    throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'unknown error'}`);
  }
}

/**
 * Encrypts a string and returns base64-encoded components
 * Convenience wrapper for text encryption
 * 
 * @param plaintext - Text to encrypt
 * @param recordId - Record identifier
 * @returns Object with base64-encoded components
 */
export async function encryptText(
  plaintext: string,
  recordId: string
): Promise<{
  ciphertext: string;
  iv: string;
  key: string;
}> {
  const plaintextBytes = new TextEncoder().encode(plaintext);
  const encrypted = await encryptRecord(plaintextBytes, recordId);

  return {
    ciphertext: bytesToBase64(encrypted.ciphertext),
    iv: bytesToBase64(encrypted.iv),
    key: bytesToBase64(encrypted.recordKey),
  };
}

/**
 * Decrypts base64-encoded components and returns text
 * Convenience wrapper for text decryption
 * 
 * @param ciphertext - Base64-encoded ciphertext
 * @param iv - Base64-encoded IV
 * @param key - Base64-encoded key
 * @param recordId - Record identifier
 * @returns Decrypted text
 */
export async function decryptText(
  ciphertext: string,
  iv: string,
  key: string,
  recordId: string
): Promise<string> {
  const ciphertextBytes = base64ToBytes(ciphertext);
  const ivBytes = base64ToBytes(iv);
  const keyBytes = base64ToBytes(key);

  const plaintext = await decryptRecord(ciphertextBytes, ivBytes, keyBytes, recordId);
  return new TextDecoder().decode(plaintext);
}

/**
 * Converts bytes to base64 string
 */
function bytesToBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

/**
 * Converts base64 string to bytes
 */
function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Computes SHA-256 hash of data
 * Useful for content addressing and integrity checks
 * 
 * @param data - Data to hash
 * @returns Hash bytes
 */
export async function sha256(data: Uint8Array): Promise<Uint8Array> {
  const hash = await crypto.subtle.digest('SHA-256', data);
  return new Uint8Array(hash);
}

/**
 * Computes SHA-256 hash and returns hex string
 * 
 * @param data - Data to hash
 * @returns Hex string with 0x prefix
 */
export async function sha256Hex(data: Uint8Array): Promise<string> {
  const hash = await sha256(data);
  return '0x' + Array.from(hash)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
