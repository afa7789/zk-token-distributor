#!/usr/bin/env bun
// Wrapper for SMTHash0 and SMTHash1 using circomlibjs
(async () => {
  try {
    // Usa o mesmo padrão do generator que funcionou
    const getHashes = (await import('../circuits/circom/node_modules/circomlibjs/src/smt_hashes_poseidon.js')).default;
    const hashes = await getHashes();

    const args = process.argv.slice(2);
    if (args.length < 3) {
      console.error('poseidon3 requires 3 arguments: a b type (hash0 or hash1)');
      process.exit(1);
    }

    const a = BigInt(args[0]);
    const b = BigInt(args[1]);
    const type = args[2].toLowerCase();

    let res;
    if (type === "hash0") {
      // SMTHash2: Poseidon([a, b]) - para nós internos
      res = hashes.F.toString(hashes.hash0(a, b));
    } else if (type === "hash1") {
      // SMTHash1: Poseidon([a, b, 1]) - para folhas
      res = hashes.F.toString(hashes.hash1(a, b));
    } else {
      console.error('Unknown type. Use hash0 or hash1.');
      process.exit(1);
    }
    console.log(res);
  } catch (e) {
    console.error('Error running poseidon3:', e && e.message ? e.message : e);
    process.exit(1);
  }
})();
