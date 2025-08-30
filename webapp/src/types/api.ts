// API Response Types
export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Authentication Types
export interface AuthSession {
  address: string;
  token: string;
  expiresAt: number;
}

export interface SIWEChallenge {
  message: string;
  nonce: string;
}

// Calldata Types
export interface CalldataEntry {
  userAddress: string;
  amount: string;
  nullifier: string;
  nullifierHash: string;
  merkleRoot: string;
  siblings: string[];
}

export interface CalldataFile {
  id: string;
  name: string;
  entries: CalldataEntry[];
  createdAt: string;
  size: number;
}

// Contract Types
export interface ContractAddresses {
  token: string;
  distributor: string;
  verifier: string;
}

export interface ClaimData {
  proof: {
    a: [string, string];
    b: [[string, string], [string, string]];
    c: [string, string];
  };
  publicSignals: [string];
  amount: string;
}

// API Request Types
export interface GenerateCalldataRequest {
  address: string;
  sessionToken: string;
}

export interface ClaimRequest {
  address: string;
  claimData: ClaimData;
}

// UI State Types
export interface LoadingState {
  isLoading: boolean;
  message?: string;
}

export interface ErrorState {
  hasError: boolean;
  message?: string;
  code?: string;
}

// File Upload Types
export interface FileUploadState {
  isUploading: boolean;
  progress: number;
  error?: string;
}

// Transaction Types
export interface TransactionState {
  isPending: boolean;
  hash?: string;
  error?: string;
  success?: boolean;
}
