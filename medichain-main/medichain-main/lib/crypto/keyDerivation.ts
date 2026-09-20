/**
 * MediChain Shield - Key Derivation Module
 * 
 * Derives deterministic X25519 keypairs from wallet signatures using HKDF-SHA256.
 * Keys are held in memory only and never persisted to disk or browser storage.
 * 
 * Security guarantees:
 * - EIP-191 message signing for wallet-based identity
 * - HKDF-SHA256 for key derivation (NIST SP 800-56C compliant)
 * - X25519 elliptic curve for asymmetric encryption
 * - Secure memory wiping via crypto.getRandomValues() overwrite
 */

import sodium from 'libsodium-wrappers';

// Fixed versioned message for deterministic key derivation
const SHIELD_KEY_MESSAGE_VERSION = 'v1';

/**
 * Securely wipes a buffer by overwriting with random data
 * @param buffer - Buffer to wipe
 */
export function zeroize(buffer: Uint8Array): void {
  if (buffer && buffer.length > 0) {
    crypto.getRandomValues(buffer);
    buffer.fill(0);
  }
}

/**
 * Generates the deterministic EIP-191 message for key derivation
 * @param chainId - Blockchain chain ID
 * @param address - Ethereum address (lowercase, with 0x prefix)
 * @returns Message string to be signed
 */
export function generateKeyDerivationMessage(
  chainId: number,
  address: string
): string {
  return `MediChain Shield Identity Key ${SHIELD_KEY_MESSAGE_VERSION}\nChain ID: ${chainId}\nAddress: ${address.toLowerCase()}`;
}

/**
 * Derives a key using HKDF-SHA256
 * @param ikm - Input key material (signature bytes)
 * @param salt - Salt (optional, uses zero bytes if not provided)
 * @param info - Context information string
 * @param length - Desired output key length in bytes
 * @returns Derived key
 */
async function hkdfDerive(
  ikm: Uint8Array,
  salt: Uint8Array,
  info: string,
  length: number
): Promise<Uint8Array> {
  // Import the input key material
  const key = await crypto.subtle.importKey(
    'raw',
    ikm,
    { name: 'HKDF' },
    false,
    ['deriveBits']
  );

  // Derive bits using HKDF-SHA256
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: salt,
      info: new TextEncoder().encode(info),
    },
    key,
    length * 8 // Convert bytes to bits
  );

  return new Uint8Array(derivedBits);
}

/**
 * X25519 Keypair
 */
export interface X25519KeyPair {
  publicKey: Uint8Array;
  privateKey: Uint8Array;
}

/**
 * Derives an X25519 keypair from a wallet signature
 * 
 * @param signature - Raw signature bytes (65 bytes for ECDSA)
 * @param chainId - Chain ID used in the signed message
 * @param address - Ethereum address (with 0x prefix)
 * @returns X25519 keypair (memory-only, caller must zeroize)
 * 
 * @throws Error if signature is invalid or derivation fails
 */
export async function deriveX25519KeyPair(
  signature: string | Uint8Array,
  chainId: number,
  address: string
): Promise<X25519KeyPair> {
  await sodium.ready;

  // Convert signature to bytes if needed
  let sigBytes: Uint8Array;
  if (typeof signature === 'string') {
    // Remove 0x prefix if present
    const cleanSig = signature.startsWith('0x') ? signature.slice(2) : signature;
    sigBytes = new Uint8Array(
      cleanSig.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []
    );
  } else {
    sigBytes = signature;
  }

  if (sigBytes.length !== 65) {
    throw new Error(`Invalid signature length: expected 65 bytes, got ${sigBytes.length}`);
  }

  try {
    // Use HKDF to derive seed material
    // Salt: empty (all zeros)
    const salt = new Uint8Array(32);
    
    // Info: context string with chain ID and address
    const info = `MediChain-Shield-${SHIELD_KEY_MESSAGE_VERSION}-${chainId}-${address.toLowerCase()}`;
    
    // Derive 32 bytes of key material for X25519 private key
    const seed = await hkdfDerive(sigBytes, salt, info, 32);

    // Derive X25519 keypair from seed
    // libsodium's crypto_box_seed_keypair derives a keypair from exactly 32 bytes
    const keypair = sodium.crypto_box_seed_keypair(seed);

    // Zeroize intermediate seed
    zeroize(seed);

    return {
      publicKey: keypair.publicKey,
      privateKey: keypair.privateKey,
    };
  } catch (error) {
    throw new Error(`Key derivation failed: ${error instanceof Error ? error.message : 'unknown error'}`);
  } finally {
    // Zeroize signature bytes
    zeroize(sigBytes);
  }
}

/**
 * Validates that a public key is a valid X25519 key
 * @param publicKey - Public key bytes
 * @returns true if valid
 */
export function isValidX25519PublicKey(publicKey: Uint8Array): boolean {
  return publicKey.length === sodium.crypto_box_PUBLICKEYBYTES;
}

/**
 * Converts a keypair to a hex string format for transmission
 * WARNING: Only use for public keys. Never transmit private keys.
 * @param key - Key bytes
 * @returns Hex string with 0x prefix
 */
export function keyToHex(key: Uint8Array): string {
  return '0x' + Array.from(key)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Converts a hex string to key bytes
 * @param hex - Hex string (with or without 0x prefix)
 * @returns Key bytes
 */
export function hexToKey(hex: string): Uint8Array {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  return new Uint8Array(
    cleanHex.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []
  );
}

/**
 * Key wiper class for automatic cleanup
 * Ensures keys are wiped when going out of scope
 */
export class SecureKeyPair {
  private _publicKey: Uint8Array;
  private _privateKey: Uint8Array;
  private _wiped: boolean = false;

  constructor(keypair: X25519KeyPair) {
    this._publicKey = keypair.publicKey;
    this._privateKey = keypair.privateKey;
  }

  get publicKey(): Uint8Array {
    if (this._wiped) throw new Error('Key has been wiped');
    return this._publicKey;
  }

  get privateKey(): Uint8Array {
    if (this._wiped) throw new Error('Key has been wiped');
    return this._privateKey;
  }

  /**
   * Securely wipes both keys
   */
  wipe(): void {
    if (!this._wiped) {
      zeroize(this._publicKey);
      zeroize(this._privateKey);
      this._wiped = true;
    }
  }

  /**
   * Automatic cleanup
   */
  [Symbol.dispose](): void {
    this.wipe();
  }
}
