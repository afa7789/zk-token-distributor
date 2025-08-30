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

interface UserCalldata {
  userAddress: string;
  amount: string;
  nullifier: string;
  merkleProof: string[];
  metadata: {
    keyUint: string;
    leafHash: string;
    nullifierHash: string;
    amountInTokens: string;
  };
  instructions: {
    description: string;
    steps: string[];
  };
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
      
      console.log(`✓ Generated calldata for ${leaf.key} - Amount: ${calldata.metadata.amountInTokens} tokens`);
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
        amountInTokens: user.metadata.amountInTokens
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
    const amountInTokens = (BigInt(leaf.value) / BigInt(10 ** 18)).toString();

    return {
      userAddress: leaf.key,
      amount: leaf.value,
      nullifier: leaf.nullifier,
      merkleProof: leaf.siblings,
      metadata: {
        keyUint: leaf.keyUint,
        leafHash: leaf.leafHash,
        nullifierHash: leaf.nullifierHash,
        amountInTokens
      },
      instructions: {
        description: "Use this data to generate ZK proof and claim your tokens",
        steps: [
          "1. Go to the claim page on the webapp",
          `2. Connect your wallet with address: ${leaf.key}`,
          "3. Click 'Generate Proof' - the system will use this data automatically", 
          `4. Submit the transaction to claim your ${amountInTokens} tokens`
        ]
      }
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

      const generator = new CalldataGenerator();
      return generator.generateUserCalldata(userLeaf);
    } catch (error) {
      console.error('Error generating user calldata:', error);
      return null;
    }
  }
}

export default CalldataGenerator;
