const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const circomlibjs = require('circomlibjs');
let hashes, poseidonReady = false;

// Cria as funções hash usando o módulo local do circomlibjs
async function initializeHashes() {
    try {
        // Importa diretamente do node_modules local
        const getHashes = (await import('./node_modules/circomlibjs/src/smt_hashes_poseidon.js')).default;
        hashes = await getHashes();
        poseidonReady = true;

        if (require.main === module) {
            main().catch(console.error);
        }
    } catch (error) {
        console.error('Erro ao inicializar hashes:', error);
        process.exit(1);
    }
}


async function main(){
await initializeHashes();

1390849295786071768276380950238675083608645509734
60000000000000000000000

console.log(
    'hash1(user,amount)',
    BigInt(hashes.F.toString(hashes.hash1(
        1390849295786071768276380950238675083608645509734n,
        60000000000000000000000n
    )))
)

console.log('hash1(1,1)', BigInt(hashes.F.toString(hashes.hash1(1, 1))))
console.log('hash1(0,0)', BigInt(hashes.F.toString(hashes.hash1(0, 0))))
console.log('hash0(0,0)', BigInt(hashes.F.toString(hashes.hash0(1, 1))))
console.log('hash0(1,1)', BigInt(hashes.F.toString(hashes.hash0(0, 0))))
}

main().then(() => process.exit(0)).catch(console.error);
