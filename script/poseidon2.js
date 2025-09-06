#!/usr/bin/env bun
// Simple wrapper that computes Poseidon with arity 2 using circomlibjs
(async () => {
  try {
    // Usa o mesmo padrão do generator que funcionou
    const getHashes = (await import('../circuits/circom/node_modules/circomlibjs/src/smt_hashes_poseidon.js')).default;
    const hashes = await getHashes();

    const args = process.argv.slice(2);
    if (args.length < 2) {
      console.error('poseidon2 requires 2 arguments');
      process.exit(1);
    }

    const a = BigInt(args[0]);
    const b = BigInt(args[1]);

    // Usa hash0 para 2 argumentos: Poseidon([a, b])
    const res = hashes.F.toString(hashes.hash0(a, b));
    console.log(res);
  } catch (e) {
    console.error('Error running poseidon2:', e && e.message ? e.message : e);
    process.exit(1);
  }
})();
