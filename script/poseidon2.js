#!/usr/bin/env bun
// Simple wrapper that computes Poseidon with arity 2 using circomlibjs
(async () => {
  try {
    const circomlibjs = require('circomlibjs');
    const poseidon = await circomlibjs.buildPoseidon();

    const args = process.argv.slice(2);
    if (args.length < 2) {
      console.error('poseidon2 requires 2 arguments');
      process.exit(1);
    }

    const a = BigInt(args[0]);
    const b = BigInt(args[1]);

    const res = poseidon.F.toString(poseidon([a, b]));
    console.log(res);
  } catch (e) {
    console.error('Error running poseidon2:', e && e.message ? e.message : e);
    process.exit(1);
  }
})();
