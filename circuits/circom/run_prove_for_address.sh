#!/usr/bin/env bash
set -euo pipefail

# Usage: ./run_prove_for_address.sh [userAddress]
# Default userAddress is the one you provided in the request.

ADDR=${1:-1390849295786071768276380950238675083608645509734}
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
INPUTS_FILE="$REPO_ROOT/out/inputs_circom_fixed.json"
TARGET_INPUT="$SCRIPT_DIR/input.json"
GENERATOR_JS="$SCRIPT_DIR/output/generate_witness.js"
WASM="$SCRIPT_DIR/output/merkle_tree.wasm"
WITNESS="$SCRIPT_DIR/output/witness.wtns"
ZKEY="$SCRIPT_DIR/output/merkle_tree_01.zkey"
PROOF="$SCRIPT_DIR/output/proof.json"
PUBLIC="$SCRIPT_DIR/output/public.json"
VK="$SCRIPT_DIR/output/verification_key.json"

echo "Using address: $ADDR"
echo "Inputs source: $INPUTS_FILE"

if [ ! -f "$INPUTS_FILE" ]; then
  echo "ERROR: inputs file not found: $INPUTS_FILE" >&2
  exit 1
fi

# Extract object for address into input.json
if command -v jq >/dev/null 2>&1; then
  echo "Extracting input using jq..."
  jq --arg addr "$ADDR" '.[] | select(.userAddress == $addr)' "$INPUTS_FILE" > "$TARGET_INPUT" || true
else
  echo "jq not found, using node fallback..."
  node -e "const fs=require('fs');const p='$INPUTS_FILE';const out='$TARGET_INPUT';const addr=process.argv[1];const data=JSON.parse(fs.readFileSync(p,'utf8'));const found=(Array.isArray(data)?data.find(x=>x.userAddress==addr):null);if(!found){console.error('address not found');process.exit(2);}fs.writeFileSync(out,JSON.stringify(found,null,2));" "$ADDR"
fi

if [ ! -s "$TARGET_INPUT" ]; then
  echo "ERROR: No input generated for address $ADDR" >&2
  exit 2
fi

echo "Wrote $TARGET_INPUT"

# Generate witness
if [ ! -f "$GENERATOR_JS" ]; then
  echo "ERROR: witness generator not found: $GENERATOR_JS" >&2
  exit 1
fi
if [ ! -f "$WASM" ]; then
  echo "ERROR: wasm not found: $WASM" >&2
  exit 1
fi

if command -v bun >/dev/null 2>&1; then
  RUNNER=bun
elif command -v node >/dev/null 2>&1; then
  RUNNER=node
else
  echo "ERROR: neither bun nor node found in PATH" >&2
  exit 1
fi


echo "Running witness generator with $RUNNER"
echo -e "$RUNNER \"$GENERATOR_JS\" \"$WASM\" \"$TARGET_INPUT\" \"$WITNESS\""
set +e
$RUNNER "$GENERATOR_JS" "$WASM" "$TARGET_INPUT" "$WITNESS"
WIT_EXIT=$?
set -e

if [ $WIT_EXIT -ne 0 ]; then
  echo "Witness generation failed (exit $WIT_EXIT). See above logs." >&2
  exit $WIT_EXIT
fi

echo "Witness generated: $WITNESS"

# Run snarkjs prove and verify if snarkjs available
if ! command -v snarkjs >/dev/null 2>&1; then
  echo "snarkjs not found in PATH, skipping prove/verify. You can install it with 'npm i -g snarkjs'" >&2
  exit 0
fi

if [ ! -f "$ZKEY" ]; then
  echo "ZKey not found ($ZKEY). If you want to run full prove, generate zkey first." >&2
  exit 0
fi

echo "Running snarkjs groth16 prove..."
set +e
snarkjs groth16 prove "$ZKEY" "$WITNESS" "$PROOF" "$PUBLIC"
PROVE_EXIT=$?
set -e

if [ $PROVE_EXIT -ne 0 ]; then
  echo "snarkjs prove failed (exit $PROVE_EXIT)." >&2
  exit $PROVE_EXIT
fi

echo "Proof generated: $PROOF"

if [ ! -f "$VK" ]; then
  echo "Verification key not found ($VK). Skipping verify." >&2
  exit 0
fi

echo "Running snarkjs groth16 verify..."
snarkjs groth16 verify "$VK" "$PUBLIC" "$PROOF"
VERIFY_EXIT=$?

if [ $VERIFY_EXIT -ne 0 ]; then
  echo "Verification failed (exit $VERIFY_EXIT)." >&2
  exit $VERIFY_EXIT
fi

echo "Proof verified successfully."

# Export Solidity calldata
echo "Exporting Solidity calldata..."
snarkjs zkey export soliditycalldata "$PUBLIC" "$PROOF" > "$SCRIPT_DIR/output/calldata.txt"
echo "Calldata exported to $SCRIPT_DIR/output/calldata.txt"

# Fix calldata.txt to be valid JSON (add outer brackets)
echo "Fixing calldata.txt to be valid JSON..."
if command -v $RUNNER >/dev/null 2>&1; then
  $RUNNER -e "
    const fs = require('fs');
    const calldataPath = '$SCRIPT_DIR/output/calldata.txt';
    
    try {
      let calldata = fs.readFileSync(calldataPath, 'utf8').trim();
      
      // Fix calldata.txt to be valid JSON if it's missing outer brackets
      if (!calldata.startsWith('[')) {
        calldata = '[' + calldata + ']';
        fs.writeFileSync(calldataPath, calldata);
        console.log('Fixed calldata.txt to be valid JSON');
      }
    } catch (error) {
      console.error('Error fixing calldata.txt:', error);
      process.exit(1);
    }
  "
else
  echo "Warning: Could not fix calldata.txt format (no JavaScript runtime found)"
fi

exit 0
