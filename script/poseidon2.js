#!/usr/bin/env bun
// Simple wrapper that computes Poseidon with arity 2 using poseidon-lite
try {
  const poseidonLite = require('poseidon-lite');
  const poseidon2 = poseidonLite.poseidon2;

  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error('poseidon2 requires 2 arguments');
    process.exit(1);
  }

  const a = BigInt(args[0]);
  const b = BigInt(args[1]);

  const res = poseidon2([a.toString(), b.toString()]);
  // print decimal representation
  console.log(res.toString());
} catch (e) {
  console.error('Error running poseidon2:', e && e.message ? e.message : e);
  process.exit(1);
}
