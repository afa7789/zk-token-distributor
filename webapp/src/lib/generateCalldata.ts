import { promises as fs } from 'fs';
import path from 'path';

interface SMTLeaf {
  key: string;
  keyUint: string;
  value: string;
  leafHash: string;
  nullifier: string;
  nullifierHash: string;
  siblings: string[];
}

interface SMTResults {
  smtRoot: string;
  treeLevels: number;
  hashFunction: string;
  treeType: string;
  totalAmount: string;
  leaves: SMTLeaf[];
}

/**
 * UserCalldata interface matching exactly what the circuit needs for proof generation.
 * Based on airdrop_smt.circom inputs and snarkjs requirements.
 */
interface UserCalldata {
  // Circuit inputs (matching input.json structure)
  merkleRoot: string;
  nullifierHash: string;
  userAddress: string;
  amount: string;
  nullifier: string;
  siblings: string[];
  // Additional metadata for UI display
  amountInTokens: string;
}

interface CalldataSummary {
  totalUsers: number;
  totalAmount: string;
  totalAmountInTokens: string;
  smtRoot: string;
  treeLevels: number;
  users: Array<{
    address: string;
    amount: string;
    amountInTokens: string;
  }>;
}

export class CalldataGenerator {
  private smtResults: SMTResults | null = null;
  private outputDir: string;

  constructor(outputDir: string = '/tmp/calldata') {
    this.outputDir = outputDir;
  }

  async loadSMTResults(filePath: string): Promise<void> {
    try {
      const data = await fs.readFile(filePath, 'utf8');
      this.smtResults = JSON.parse(data);
    } catch (error) {
      throw new Error(`Failed to load SMT results: ${error}`);
    }
  }

  async generateAllCalldata(): Promise<void> {
    if (!this.smtResults) {
      throw new Error('SMT results not loaded. Call loadSMTResults() first.');
    }

    // Create output directory
    await fs.mkdir(this.outputDir, { recursive: true });

    console.log(`Generating calldata for ${this.smtResults.leaves.length} users...`);

    const validUsers: UserCalldata[] = [];

    // Generate calldata for each user
    for (const leaf of this.smtResults.leaves) {
      // Skip zero address
      if (leaf.key === '0x0000000000000000000000000000000000000000') {
        continue;
      }

      const calldata = this.generateUserCalldata(leaf);
      validUsers.push(calldata);

      // Write individual user calldata
      const filename = path.join(this.outputDir, `${leaf.key}.json`);
      await fs.writeFile(filename, JSON.stringify(calldata, null, 2));
      
      console.log(`✓ Generated calldata for ${leaf.key} - Amount: ${calldata.amountInTokens} tokens`);
    }

    // Create summary file
    const summary: CalldataSummary = {
      totalUsers: validUsers.length,
      totalAmount: this.smtResults.totalAmount,
      totalAmountInTokens: (BigInt(this.smtResults.totalAmount) / BigInt(10 ** 18)).toString(),
      smtRoot: this.smtResults.smtRoot,
      treeLevels: this.smtResults.treeLevels,
      users: validUsers.map(user => ({
        address: user.userAddress,
        amount: user.amount,
        amountInTokens: user.amountInTokens
      }))
    };

    await fs.writeFile(
      path.join(this.outputDir, 'summary.json'), 
      JSON.stringify(summary, null, 2)
    );

    console.log('\n📋 Summary:');
    console.log(`Total Users: ${summary.totalUsers}`);
    console.log(`Total Amount: ${summary.totalAmountInTokens} tokens`);
    console.log(`SMT Root: ${summary.smtRoot}`);
    console.log(`\nCalldata files generated in: ${this.outputDir}/`);
  }

  private generateUserCalldata(leaf: SMTLeaf): UserCalldata {
    if (!this.smtResults) {
      throw new Error('SMT results not loaded');
    }

    const amountInTokens = (BigInt(leaf.value) / BigInt(10 ** 18)).toString();

    return {
      merkleRoot: this.smtResults.smtRoot,
      nullifierHash: leaf.nullifierHash,
      userAddress: leaf.key,
      amount: leaf.value,
      nullifier: leaf.nullifier,
      siblings: leaf.siblings,
      amountInTokens
    };
  }

  // Static method for use in API routes
  static async generateCalldataForUser(userAddress: string, smtResultsPath: string): Promise<UserCalldata | null> {
    try {
      const data = await fs.readFile(smtResultsPath, 'utf8');
      const smtResults: SMTResults = JSON.parse(data);
      
      const userLeaf = smtResults.leaves.find(leaf => 
        leaf.key.toLowerCase() === userAddress.toLowerCase()
      );
      
      if (!userLeaf || userLeaf.key === '0x0000000000000000000000000000000000000000') {
        return null;
      }

      const amountInTokens = (BigInt(userLeaf.value) / BigInt(10 ** 18)).toString();

      return {
        merkleRoot: smtResults.smtRoot,
        nullifierHash: userLeaf.nullifierHash,
        userAddress: userLeaf.key,
        amount: userLeaf.value,
        nullifier: userLeaf.nullifier,
        siblings: userLeaf.siblings,
        amountInTokens
      };
    } catch (error) {
      console.error('Error generating user calldata:', error);
      return null;
    }
  }
}

export default CalldataGenerator;
