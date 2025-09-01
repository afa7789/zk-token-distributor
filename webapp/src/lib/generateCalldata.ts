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
 * Updated for the new circuit with 3 outputs: merkleRootOut, nullifierHashOut, amountOut
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

  /**
   * Ensures proper field element format for circom (BigInt conversion)
   */
  private formatFieldElement(value: string): string {
    return BigInt(value).toString();
  }

  /**
   * Converts amount from wei to tokens for display
   */
  private formatTokenAmount(amountWei: string): string {
    const tokens = BigInt(amountWei) / BigInt(10 ** 18);
    return tokens.toString();
  }

  /**
   * Generate calldata for a specific user leaf
   */
  private generateUserCalldata(leaf: SMTLeaf): UserCalldata {
    if (!this.smtResults) {
      throw new Error('SMT results not loaded');
    }

    return {
      merkleRoot: this.formatFieldElement(this.smtResults.smtRoot),
      nullifierHash: this.formatFieldElement(leaf.nullifierHash),
      userAddress: this.formatFieldElement(leaf.keyUint),
      amount: this.formatFieldElement(leaf.value),
      nullifier: this.formatFieldElement(leaf.nullifier),
      siblings: leaf.siblings.map(s => this.formatFieldElement(s)),
      amountInTokens: this.formatTokenAmount(leaf.value)
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

      const formatFieldElement = (value: string): string => BigInt(value).toString();
      const formatTokenAmount = (amountWei: string): string => {
        const tokens = BigInt(amountWei) / BigInt(10 ** 18);
        return tokens.toString();
      };

      return {
        merkleRoot: formatFieldElement(smtResults.smtRoot),
        nullifierHash: formatFieldElement(userLeaf.nullifierHash),
        userAddress: formatFieldElement(userLeaf.keyUint),
        amount: formatFieldElement(userLeaf.value),
        nullifier: formatFieldElement(userLeaf.nullifier),
        siblings: userLeaf.siblings.map(s => formatFieldElement(s)),
        amountInTokens: formatTokenAmount(userLeaf.value)
      };
    } catch (error) {
      console.error('Error generating user calldata:', error);
      return null;
    }
  }
}

export default CalldataGenerator;
