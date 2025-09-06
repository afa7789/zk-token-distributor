#!/usr/bin/env bun
import { buildPoseidon } from "circomlibjs/src/poseidon_wasm.js";
import { getCurveFromName } from "ffjavascript";

const args = process.argv.slice(2);
if (args.length < 3) {
  console.error('poseidon3 requires 3 arguments: a b type (hash0 or hash1)');
  process.exit(1);
}

const a = BigInt(args[0]);
const b = BigInt(args[1]);
const type = args[2].toLowerCase();

(async () => {
  const bn128 = await getCurveFromName("bn128", true);
  const poseidon = await buildPoseidon();

  let res;
  if (type === "hash0") {
    res = bn128.Fr.toString(poseidon([a, b]));
  } else if (type === "hash1") {
    res = bn128.Fr.toString(poseidon([a, b, bn128.Fr.one]));
  } else {
    console.error('Unknown type. Use hash0 or hash1.');
    process.exit(1);
  }
  console.log(res);
})();
