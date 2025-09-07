import * as snarkjs from 'snarkjs';

export interface ZKProofInputs {
  merkleRoot: string;
  nullifierHash: string;
  userAddress: string;
  amount: string;
  nullifier: string;
  pathElements: string[];
  pathIndices: string;
}

export interface ZKProof {
  a: [string, string];
  b: [[string, string], [string, string]];
  c: [string, string];
}

export interface ZKProofData {
  proof: ZKProof;
  publicSignals: [string, string, string]; // Updated: now 3 public signals [merkleRoot, nullifierHash, amount]
}

// Ensure proper field element format for circom
function formatFieldElement(value: string): string {
  return BigInt(value).toString();
}

export class ZKProofGenerator {
  private wasmUrl: string;
  private zkeyUrl: string;
  private verificationKeyUrl: string;

  constructor() {
    this.wasmUrl = '/circom/merkle_tree.wasm';
    this.zkeyUrl = '/circom/merkle_tree_01.zkey';
    this.verificationKeyUrl = '/circom/verification_key.json';
  }

  async generateProof(inputs: ZKProofInputs): Promise<ZKProofData> {
    try {
      console.log('🔄 Starting ZK proof generation...');
      console.log('📊 Input data:', {
        merkleRoot: inputs.merkleRoot,
        nullifierHash: inputs.nullifierHash,
        amount: inputs.amount,
        userAddress: inputs.userAddress,
        pathElementsCount: inputs.pathElements.length,
        pathIndices: inputs.pathIndices
      });

      // Prepare circuit inputs in the format expected by the new circom circuit
      const circuitInputs = {
        merkleRoot: formatFieldElement(inputs.merkleRoot),
        nullifierHash: formatFieldElement(inputs.nullifierHash),
        userAddress: formatFieldElement(inputs.userAddress),
        amount: formatFieldElement(inputs.amount),
        nullifier: formatFieldElement(inputs.nullifier),
        pathElements: inputs.pathElements.map(formatFieldElement),
        pathIndices: formatFieldElement(inputs.pathIndices),
      };

      console.log('🔧 Formatted circuit inputs:', circuitInputs);

      // Generate the proof using snarkjs
      const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        circuitInputs,
        this.wasmUrl,
        this.zkeyUrl
      );

      console.log('✅ Generated proof:', proof);
      console.log('📋 Public signals:', publicSignals);

      // Validate that we have exactly 3 public signals
      if (!publicSignals || publicSignals.length !== 3) {
        throw new Error(`Expected 3 public signals, got ${publicSignals?.length || 0}`);
      }

      // Format proof for Solidity verifier
      const formattedProof: ZKProof = {
        a: [proof.pi_a[0], proof.pi_a[1]],
        b: [[proof.pi_b[0][1], proof.pi_b[0][0]], [proof.pi_b[1][1], proof.pi_b[1][0]]],
        c: [proof.pi_c[0], proof.pi_c[1]]
      };

      return {
        proof: formattedProof,
        publicSignals: [publicSignals[0], publicSignals[1], publicSignals[2]] as [string, string, string]
      };
    } catch (error) {
      console.error('❌ ZK proof generation failed:', error);
      throw new Error(`Failed to generate ZK proof: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async verifyProof(proofData: ZKProofData, publicSignals: string[]): Promise<boolean> {
    try {
      // Load verification key
      const vKeyResponse = await fetch(this.verificationKeyUrl);
      const vKey = await vKeyResponse.json();

      // Validate public signals count
      if (publicSignals.length !== 3) {
        console.error(`Expected 3 public signals, got ${publicSignals.length}`);
        return false;
      }

      // Format proof for verification
      const proof = {
        protocol: "groth16",
        curve: "bn128",
        pi_a: [proofData.proof.a[0], proofData.proof.a[1], "1"],
        pi_b: [[proofData.proof.b[0][1], proofData.proof.b[0][0]], [proofData.proof.b[1][1], proofData.proof.b[1][0]], ["1", "0"]],
        pi_c: [proofData.proof.c[0], proofData.proof.c[1], "1"]
      };

      const result = await snarkjs.groth16.verify(vKey, publicSignals, proof);
      console.log('🔍 Proof verification result:', result);
      
      return result;
    } catch (error) {
      console.error('❌ ZK proof verification failed:', error);
      return false;
    }
  }

  // Helper method to create proof inputs from user data
  static createInputsFromUserData(userData: ZKProofInputs): ZKProofInputs {
    return {
      merkleRoot: userData.merkleRoot,
      nullifierHash: userData.nullifierHash,
      userAddress: userData.userAddress,
      amount: userData.amount,
      nullifier: userData.nullifier,
      pathElements: userData.pathElements,
      pathIndices: userData.pathIndices
    };
  }
}

export const zkProofGenerator = new ZKProofGenerator();
