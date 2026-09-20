/**
 * MediChain Shield - Keys Hook
 * 
 * Headless hook for managing in-memory encryption keypairs.
 * Keys are automatically wiped on wallet disconnect or network change.
 */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAccount, useChainId } from "wagmi";
import { useWalletClient } from "wagmi";
import {
  deriveX25519KeyPair,
  generateKeyDerivationMessage,
  zeroize,
  keyToHex,
  type X25519KeyPair,
} from "../crypto";

/**
 * Shield keys state
 */
interface ShieldKeysState {
  keypair: X25519KeyPair | null;
  publicKeyHex: string | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Shield keys hook
 */
export function useShieldKeys() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { data: walletClient } = useWalletClient();

  const [state, setState] = useState<ShieldKeysState>({
    keypair: null,
    publicKeyHex: null,
    isLoading: false,
    error: null,
  });

  // Keep reference to keypair for cleanup
  const keypairRef = useRef<X25519KeyPair | null>(null);

  /**
   * Wipe keys from memory
   */
  const wipeKeys = useCallback(() => {
    if (keypairRef.current) {
      zeroize(keypairRef.current.publicKey);
      zeroize(keypairRef.current.privateKey);
      keypairRef.current = null;
    }

    setState({
      keypair: null,
      publicKeyHex: null,
      isLoading: false,
      error: null,
    });
  }, []);

  /**
   * Derive keypair from wallet signature
   */
  const deriveKeys = useCallback(async () => {
    if (!address || !chainId || !walletClient) {
      wipeKeys();
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // Generate message to sign
      const message = generateKeyDerivationMessage(chainId, address);

      // Request signature from wallet
      const signature = await walletClient.signMessage({ message });

      // Derive keypair
      const keypair = await deriveX25519KeyPair(signature, chainId, address);

      // Store reference for cleanup
      keypairRef.current = keypair;

      // Convert public key to hex for contract
      const publicKeyHex = keyToHex(keypair.publicKey);

      setState({
        keypair,
        publicKeyHex,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      wipeKeys();
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error : new Error("Key derivation failed"),
      }));
    }
  }, [address, chainId, walletClient, wipeKeys]);

  /**
   * Auto-wipe on wallet disconnect or network change
   */
  useEffect(() => {
    if (!isConnected) {
      wipeKeys();
    }
  }, [isConnected, wipeKeys]);

  useEffect(() => {
    // Wipe on network change if keys exist
    if (state.keypair) {
      wipeKeys();
    }
  }, [chainId]); // Don't include wipeKeys to avoid loop

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      wipeKeys();
    };
  }, [wipeKeys]);

  return {
    ...state,
    deriveKeys,
    wipeKeys,
    hasKeys: !!state.keypair,
  };
}

export default useShieldKeys;
