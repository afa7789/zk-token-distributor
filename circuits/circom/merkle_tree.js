import * as circomlibjs from "circomlibjs";

const DEFAULT_ZERO = 21663839004416932945382355908790599225266501822907911457504978515578255421292n;

let poseidon;

// Initialize Poseidon hash function
async function initPoseidon() {
    if (!poseidon) {
        poseidon = await circomlibjs.buildPoseidon();
    }
    return poseidon;
}

// Ensure poseidon is initialized
poseidon = await initPoseidon();

export function poseidonHash(left, right) {
    if (!poseidon) {
        throw new Error('Poseidon not initialized');
    }
    
    const leftBigInt = typeof left === 'bigint' ? left : BigInt(left);
    const rightBigInt = typeof right === 'bigint' ? right : BigInt(right);
    
    const hash = poseidon([leftBigInt, rightBigInt]);
    // Convert the field element to a proper BigInt
    const result = poseidon.F.toObject(hash);
    return BigInt(result.toString());
}

export function toFixedHex(number, length = 32) {
    const bigIntNumber = typeof number === 'bigint' ? number : BigInt(number);
    let hex = bigIntNumber.toString(16);
    
    // Handle negative numbers
    if (hex.startsWith('-')) {
        hex = hex.slice(1);
        let paddedHex = hex.padStart(length * 2, '0');
        return '-0x' + paddedHex;
    }
    
    let paddedHex = hex.padStart(length * 2, '0');
    return '0x' + paddedHex;
}

export class MerkleTree {
    constructor(
        levels,
        elements = [],
        { hashFunction = poseidonHash, zeroElement = DEFAULT_ZERO } = {}
    ) {
        this.levels = Number(levels);
        this.capacity = 2 ** this.levels;

        if (elements.length > this.capacity) {
            throw new Error('Tree is full');
        }

        this._hash = hashFunction;
        this.zeroElement = typeof zeroElement === 'bigint' ? zeroElement : BigInt(zeroElement);
        
        // Initialize zeros array
        this._zeros = [];
        this._zeros[0] = this.zeroElement;

        // Build zeros for each level
        for (let i = 1; i <= this.levels; i++) {
            this._zeros[i] = this._hash(this._zeros[i - 1], this._zeros[i - 1]);
        }

        // Initialize layers
        this._layers = [];
        this._layers[0] = elements.map(e => typeof e === 'bigint' ? e : BigInt(e));
        
        this._rebuild();
    }

    _rebuild() {
        for (let level = 1; level <= this.levels; level++) {
            this._layers[level] = [];
            const prevLayer = this._layers[level - 1];

            for (let i = 0; i < Math.ceil(prevLayer.length / 2); i++) {
                const left = prevLayer[i * 2];
                const right = i * 2 + 1 < prevLayer.length 
                    ? prevLayer[i * 2 + 1] 
                    : this._zeros[level - 1];
                    
                this._layers[level][i] = this._hash(left, right);
            }
        }
    }

    root() {
        return this._layers[this.levels].length > 0
            ? this._layers[this.levels][0]
            : this._zeros[this.levels];
    }

    insert(element) {
        if (this._layers[0].length >= this.capacity) {
            throw new Error('Tree is full');
        }

        this.update(this._layers[0].length, element);
    }

    update(index, element) {
        const idx = Number(index);
        if (isNaN(idx) || idx < 0 || idx > this._layers[0].length || idx >= this.capacity) {
            throw new Error('Insert index out of bounds: ' + index);
        }

        const elementBigInt = typeof element === 'bigint' ? element : BigInt(element);
        
        // Update leaf
        this._layers[0][idx] = elementBigInt;

        // Update all levels above
        let currentIndex = idx;
        for (let level = 1; level <= this.levels; level++) {
            currentIndex = Math.floor(currentIndex / 2);
            const left = this._layers[level - 1][currentIndex * 2];
            const right = currentIndex * 2 + 1 < this._layers[level - 1].length
                ? this._layers[level - 1][currentIndex * 2 + 1]
                : this._zeros[level - 1];
                
            this._layers[level][currentIndex] = this._hash(left, right);
        }
    }

    remove(element) {
        const index = this.indexOf(element);
        if (index === -1) {
            throw new Error('Element is not in the merkle tree');
        }
        this.update(index, this.zeroElement);
    }

    indexOf(element) {
        const elementBigInt = typeof element === 'bigint' ? element : BigInt(element);
        return this._layers[0].findIndex(el => el === elementBigInt);
    }

    path(index) {
        const idx = Number(index);
        if (isNaN(idx) || idx < 0 || idx >= this._layers[0].length) {
            throw new Error('Index out of bounds: ' + index);
        }

        const pathElements = [];
        const pathIndices = [];
        let currentIndex = idx;

        for (let level = 0; level < this.levels; level++) {
            pathIndices[level] = currentIndex % 2;
            const siblingIndex = currentIndex % 2 === 0 ? currentIndex + 1 : currentIndex - 1;
            
            pathElements[level] = siblingIndex < this._layers[level].length
                ? this._layers[level][siblingIndex]
                : this._zeros[level];
                
            currentIndex = Math.floor(currentIndex / 2);
        }

        return {
            element: this._layers[0][idx],
            merkleRoot: this.root(),
            pathElements,
            pathIndices,
        };
    }

    elements() {
        return this._layers[0].slice();
    }

    zeros() {
        return this._zeros.slice();
    }

    serialize() {
        return {
            _layers: this._layers,
            _zeros: this._zeros,
            levels: this.levels,
        };
    }

    static deserialize(data, hashFunction = poseidonHash) {
        const instance = Object.assign(Object.create(this.prototype), data);
        instance._hash = hashFunction;
        instance.capacity = 2 ** instance.levels;
        instance.zeroElement = instance._zeros[0];
        return instance;
    }

    // Bulk operations
    bulkInsert(elements) {
        if (this._layers[0].length + elements.length > this.capacity) {
            throw new Error('Tree is full');
        }

        for (const element of elements) {
            this.insert(element);
        }
    }

    bulkRemove(elements) {
        for (const element of elements) {
            this.remove(element);
        }
    }

    // Utility methods
    number_of_elements() {
        return this._layers[0].length;
    }

    getIndexByElement(element) {
        return this.indexOf(element);
    }

    static createTreeWithRoot(levels, leaves, targetRoot) {
        if (leaves.length > Math.pow(2, levels)) {
            return undefined;
        }

        const tree = new MerkleTree(levels, []);

        for (let i = 0; i < leaves.length; i++) {
            tree.insert(leaves[i]);
            const nextRoot = tree.root();

            if (toFixedHex(nextRoot) === targetRoot) {
                return tree;
            }
        }

        return undefined;
    }

    static calculateIndexFromPathIndices(pathIndices) {
        return pathIndices.reduce((value, isRight, level) => {
            return isRight ? value + 2 ** level : value;
        }, 0);
    }
}