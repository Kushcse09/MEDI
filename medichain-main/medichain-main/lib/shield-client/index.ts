/**
 * MediChain Shield - Client Library
 * 
 * Main export file for Shield client components.
 */

export * from "./types";
export * from "./shieldApi";
export * from "./registryContract";

export { getShieldApi, ShieldApiClient } from "./shieldApi";
export { AccessRegistryClient } from "./registryContract";
