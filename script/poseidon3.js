#!/usr/bin/env bun
// Simple wrapper that computes Poseidon with arity 3 using poseidon-lite
try {
  const poseidonLite = require('poseidon-lite');
  const poseidon3 = poseidonLite.poseidon3;

  const args = process.argv.slice(2);
  if (args.length < 3) {
    console.error('poseidon3 requires 3 arguments');
    process.exit(1);
  }

  const a = BigInt(args[0]);
  const b = BigInt(args[1]);
  const c = BigInt(args[2]);

  const res = poseidon3([a.toString(), b.toString(), c.toString()]);
  console.log(res.toString());
} catch (e) {
  console.error('Error running poseidon3:', e && e.message ? e.message : e);
  process.exit(1);
}
