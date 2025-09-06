// Copyright 2022-2023 Webb Technologies Inc.
// SPDX-License-Identifier: Apache-2.0
// This file has been modified by Webb Technologies Inc.

import { poseidon } from 'circomlibjs';
import { BigNumber } from 'ethers';

import { toFixedHex } from '../utils';

const DEFAULT_ZERO =
    '21663839004416932945382355908790599225266501822907911457504978515578255421292';

function poseidonHash(left, right) {
    return BigNumber.from(poseidon([BigNumber.from(left), BigNumber.from(right)]));
}

/**
 * Merkle tree
 */
export class MerkleTree {
    constructor(
        levels,
        elements = [],
        { hashFunction = poseidonHash, zeroElement = DEFAULT_ZERO } = {}
    ) {
        levels = Number(levels);
        this.levels = levels;
        this.capacity = 2 ** levels;

        if (elements.length > this.capacity) {
            throw new Error('Tree is full');
        }

        this._hash = hashFunction;
        this.zeroElement = BigNumber.from(zeroElement);
        this._zeros = [];
        this._zeros[0] = BigNumber.from(zeroElement);

        for (let i = 1; i <= levels; i++) {
            this._zeros[i] = this._hash(this._zeros[i - 1], this._zeros[i - 1]);
        }

        this._layers = [];
        this._layers[0] = elements.slice().map((e) => BigNumber.from(e));
        this._rebuild();
    }

    _rebuild() {
        for (let level = 1; level <= this.levels; level++) {
            this._layers[level] = [];

            for (let i = 0; i < Math.ceil(this._layers[level - 1].length / 2); i++) {
                this._layers[level][i] = this._hash(
                    this._layers[level - 1][i * 2],
                    i * 2 + 1 < this._layers[level - 1].length
                        ? this._layers[level - 1][i * 2 + 1]
                        : this._zeros[level - 1]
                );
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

        this.update(this._layers[0].length, BigNumber.from(element));
    }

    bulkRemove(elements) {
        for (const elem of elements) {
            this.remove(elem);
        }
    }

    remove(element) {
        const index = this.indexOf(element);

        if (index === -1) {
            throw new Error('Element is not in the merkle tree');
        }

        this.removeByIndex(index);
    }

    removeByIndex(index) {
        this.update(index, this.zeroElement);
    }

    bulkInsert(elements) {
        if (this._layers[0].length + elements.length > this.capacity) {
            throw new Error('Tree is full');
        }

        for (let i = 0; i < elements.length - 1; i++) {
            this._layers[0].push(BigNumber.from(elements[i]));
            let level = 0;
            let index = this._layers[0].length - 1;

            while (index % 2 === 1) {
                level++;
                index >>= 1;
                this._layers[level][index] = this._hash(
                    this._layers[level - 1][index * 2],
                    this._layers[level - 1][index * 2 + 1]
                );
            }
        }

        this.insert(elements[elements.length - 1]);
    }

    update(index, element) {
        if (
            isNaN(Number(index)) ||
            index < 0 ||
            index > this._layers[0].length ||
            index >= this.capacity
        ) {
            throw new Error('Insert index out of bounds: ' + index);
        }

        this._layers[0][index] = BigNumber.from(element);

        for (let level = 1; level <= this.levels; level++) {
            index >>= 1;
            this._layers[level][index] = this._hash(
                this._layers[level - 1][index * 2],
                index * 2 + 1 < this._layers[level - 1].length
                    ? this._layers[level - 1][index * 2 + 1]
                    : this._zeros[level - 1]
            );
        }
    }

    path(index) {
        if (isNaN(Number(index)) || index < 0 || index >= this._layers[0].length) {
            throw new Error('Index out of bounds: ' + index);
        }

        const pathElements = [];
        const pathIndices = [];

        for (let level = 0; level < this.levels; level++) {
            pathIndices[level] = index % 2;
            pathElements[level] =
                (index ^ 1) < this._layers[level].length
                    ? this._layers[level][index ^ 1]
                    : this._zeros[level];
            index >>= 1;
        }

        return {
            element: this._layers[0][index],
            merkleRoot: this.root(),
            pathElements,
            pathIndices,
        };
    }

    indexOf(element) {
        return this._layers[0].findIndex((el) => el.eq(BigNumber.from(element)));
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

    number_of_elements() {
        return this._layers[0].length;
    }

    getIndexByElement(element) {
        return this.indexOf(element);
    }

    static deserialize(data, hashFunction) {
        const instance = Object.assign(Object.create(this.prototype), data);

        instance._hash = hashFunction || poseidon;
        instance.capacity = 2 ** instance.levels;
        instance.zeroElement = instance._zeros[0];

        return instance;
    }

    static createTreeWithRoot(
        levels,
        leaves,
        targetRoot
    ) {
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
            let addedValue = value;

            if (isRight) {
                addedValue = value + 2 ** level;
            }

            return addedValue;
        });
    }
}
