#!/usr/bin/env bun

const circomlibjs = require('circomlibjs');
let hashes, poseidonReady = false;

// Inicializa as funções hash da mesma forma que o generator
async function initializeHashes() {
    try {
        // Importa diretamente do node_modules local como no generator
        const getHashes = (await import('../circuits/circom/node_modules/circomlibjs/src/smt_hashes_poseidon.js')).default;
        hashes = await getHashes();
        poseidonReady = true;
        
        // Executa após inicializar
        runPoseidon();
    } catch (error) {
        console.error('Erro ao inicializar hashes:', error);
        process.exit(1);
    }
}

function runPoseidon() {
    try {
        if (!poseidonReady) throw new Error('Poseidon not ready');
        
        const args = process.argv.slice(2);
        if (args.length < 2) {
            console.error('Requires 2 arguments');
            process.exit(1);
        }

        const a = BigInt(args[0]);
        const b = BigInt(args[1]);
        
        // Usa hash0 para 2 inputs como no generator
        const result = hashes.hash0(a, b);
        console.log(hashes.F.toString(result));
        
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

// Inicializa como no generator
initializeHashes();
