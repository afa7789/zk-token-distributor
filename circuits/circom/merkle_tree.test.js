import { MerkleTree, poseidonHash } from './merkle_tree';

test('simple MerkleTree root matches manual Poseidon computation', () => {
    const levels = 2; // capacity = 4
    const DEFAULT_ZERO = 21663839004416932945382355908790599225266501822907911457504978515578255421292n;
    
    // Use BigInt elements directly
    const elements = [1n, 2n, 3n];
    const tree = new MerkleTree(levels, elements, { zeroElement: DEFAULT_ZERO });
    
    // Manually compute expected root: h12 = H(1,2), h3z = H(3,zero), root = H(h12, h3z)
    const h12 = poseidonHash(1n, 2n);
    const h3z = poseidonHash(3n, DEFAULT_ZERO);
    const expectedRoot = poseidonHash(h12, h3z);
    
    expect(tree.root()).toEqual(expectedRoot);
});

test('MerkleTree basic operations', () => {
    const levels = 3; // capacity = 8
    const tree = new MerkleTree(levels, []);
    
    // Test insertion
    tree.insert(1n);
    tree.insert(2n);
    tree.insert(3n);
    
    expect(tree.number_of_elements()).toBe(3);
    
    // Test indexOf
    expect(tree.indexOf(2n)).toBe(1);
    expect(tree.indexOf(999n)).toBe(-1);
    
    // Test path generation
    const path = tree.path(1);
    expect(path.element).toBe(2n);
    expect(path.pathElements).toHaveLength(levels);
    expect(path.pathIndices).toHaveLength(levels);
});

test('MerkleTree with string elements', () => {
    const levels = 2;
    const elements = ['1', '2', '3']; // String elements should be converted to BigInt
    const tree = new MerkleTree(levels, elements);
    
    expect(tree.elements()).toEqual([1n, 2n, 3n]);
    expect(tree.indexOf('2')).toBe(1);
});