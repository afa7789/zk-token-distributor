// Custom error mapping
const ERROR_SIGNATURES = {
  '0xc1ab6dc1': 'InvalidToken',
  '0xe6c4247b': 'InvalidAddress', 
  '0x2c5211c6': 'InvalidAmount',
  '0xb7d09497': 'InvalidTimestamp',
  '0xea6fda4a': 'ClaimPeriodInvalid',
  '0x297b8754': 'TokenDistributor_ClaimPeriodNotEnded',
  '0x3f8e3597': 'TokenDistributor_ClaimPeriodNotStarted',
  '0xaa7b9785': 'TokenDistributor_FailedZKProofVerify',
  '0xdff40ad7': 'TokenDistributor_NoTokensToSweep',
  '0x96163cae': 'TokenDistributor_NullifierAlreadyUsed',
  '0xb0c276dd': 'TokenDistributor_ZeroAmount',
  '0x2ee5b92c': 'TokenDistributor_ClaimPeriodEnded',
} as const;

const ERROR_DESCRIPTIONS = {
  'InvalidToken': 'Invalid token contract address',
  'InvalidAddress': 'Invalid address provided',
  'InvalidAmount': 'Invalid amount (cannot be zero)',
  'InvalidTimestamp': 'Invalid timestamp provided',
  'ClaimPeriodInvalid': 'Claim period configuration is invalid',
  'TokenDistributor_ClaimPeriodNotEnded': 'Claim period has not ended yet',
  'TokenDistributor_ClaimPeriodNotStarted': 'Claim period has not started yet',
  'TokenDistributor_FailedZKProofVerify': 'ZK proof verification failed - invalid proof or public signals',
  'TokenDistributor_NoTokensToSweep': 'No tokens available to sweep',
  'TokenDistributor_NullifierAlreadyUsed': 'This nullifier has already been used - double spending attempt detected',
  'TokenDistributor_ZeroAmount': 'Claim amount cannot be zero',
  'TokenDistributor_ClaimPeriodEnded': 'The claim period has ended',
} as const;

export interface DecodedError {
  name: string;
  description: string;
  suggestion?: string;
}

export function decodeCustomError(errorData: string): DecodedError | null {
  // Extract the error selector (first 4 bytes)
  const selector = errorData.slice(0, 10) as keyof typeof ERROR_SIGNATURES;
  
  const errorName = ERROR_SIGNATURES[selector];
  if (!errorName) {
    return null;
  }

  const description = ERROR_DESCRIPTIONS[errorName];
  
  // Add specific suggestions for common errors
  let suggestion: string | undefined;
  switch (errorName) {
    case 'TokenDistributor_NullifierAlreadyUsed':
      suggestion = 'This claim has already been processed. You cannot claim twice with the same proof. If this is a test environment, restart Anvil to reset the state.';
      break;
    case 'TokenDistributor_FailedZKProofVerify':
      suggestion = 'Check that your proof was generated correctly and that the public signals match the expected format. Regenerate your calldata if needed.';
      break;
    case 'TokenDistributor_ClaimPeriodNotStarted':
      suggestion = 'The claim period has not started yet. Wait until the claim period begins.';
      break;
    case 'TokenDistributor_ClaimPeriodEnded':
      suggestion = 'The claim period has ended. You can no longer submit claims.';
      break;
    default:
      suggestion = 'Check your transaction parameters and try again.';
  }

  return {
    name: errorName,
    description,
    suggestion,
  };
}

export function formatTransactionError(error: unknown): string {
  // Try to extract revert reason from various error formats
  let revertData: string | undefined;

  const err = error as Record<string, unknown>;

  if (err?.data) {
    revertData = err.data as string;
  } else if (err?.cause && typeof err.cause === 'object') {
    const cause = err.cause as Record<string, unknown>;
    if (cause?.data) {
      revertData = cause.data as string;
    }
  } else if (err?.reason) {
    return err.reason as string;
  } else if (err?.message) {
    // Look for revert data in error message
    const message = err.message as string;
    const match = message.match(/0x[a-fA-F0-9]+/);
    if (match) {
      revertData = match[0];
    } else {
      return message;
    }
  }

  if (revertData) {
    const decoded = decodeCustomError(revertData);
    if (decoded) {
      return `${decoded.description}${decoded.suggestion ? ` - ${decoded.suggestion}` : ''}`;
    }
  }

  return (err?.message as string) || 'Unknown transaction error';
}
