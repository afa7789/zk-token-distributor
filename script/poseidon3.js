#!/usr/bin/env bun

(async () => {
  try {
    // Try multiple import methods
    let hashes;
    
    try {
      // Method 1: SMT hashes (your original method)
      const getHashes = (await import('../circuits/circom/node_modules/circomlibjs/src/smt_hashes_poseidon.js')).default;
      hashes = await getHashes();
      console.error('Using SMT hashes');
    } catch (e) {
      try {
        // Method 2: Manual SMT hash construction
        const circomlib = await import('circomlibjs');
        const poseidon = circomlib.poseidon;
        
        // Manually implement SMT hash functions
        hashes = {
          hash0: (a, b) => poseidon([a, b]),  // Internal nodes
          hash1: (key, value) => poseidon([key, value, 1n]),  // Leaves with domain separator
          F: { toString: (x) => x.toString() }
        };
        console.error('Using manual SMT hash construction');
      } catch (e2) {
        console.error('Both methods failed:', e.message, e2.message);
        process.exit(1);
      }
    }
    
    const args = process.argv.slice(2);
    if (args.length < 3) {
      console.error('Requires 3 arguments: a b type');
      process.exit(1);
    }

    const a = BigInt(args[0]);
    const b = BigInt(args[1]);
    const type = args[2].toLowerCase();

    let result;
    if (type === "hash0") {
      result = hashes.hash0(a, b);
    } else if (type === "hash1") {
      result = hashes.hash1(a, b);
    } else {
      console.error('Unknown type. Use hash0 or hash1.');
      process.exit(1);
    }
    
    console.log(hashes.F.toString(result));
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
