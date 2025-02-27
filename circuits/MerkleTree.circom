pragma circom 2.0.0;

include "../../node_modules/circomlib/circuits/poseidon.circom";
include "../../node_modules/circomlib/circuits/comparators.circom";
include "../../node_modules/circomlib/circuits/switcher.circom"; 

// compute the root of a MerkleTree of n Levels 
template MerkleTree(n) { 
    signal input leaves[2**n];
    signal output root;


    var hashes[2**(n + 1)];
    component hasher[2**(n + 1)];

    // Hash the leaf nodes
    for (var i = 0; i < 2**n; i++) {
        hashes[i] = leaves[i];
    }

    // Compute hashes level by level
    for (var i = 2**n - 1; i > 0; i--) {
        // Hash two adjacent nodes to form a parent node
        hasher[i] = Poseidon(2);

        hasher[i].inputs[0] <== hashes[2 * i];
        hasher[i].inputs[1] <== hashes[2 * i + 1];

        hashes[i] <== hasher[i].out;
    }

    // The root is the single hash at the top level
    root <== hashes[1];
}

template MerkleTreeChecker(levels) {
    signal input leaf;
    signal input pathElements[levels];
    signal input pathIndices[levels]; // path index are 0's and 1's indicating whether the current element is on the left or right
    signal input root; 

    component hashers[levels];
    component switchers[levels];

    for (var i = 0; i < levels; i++) {
        hashers[i] = Poseidon(2);
        switchers[i] = Switcher();

        switchers[i].sel <== pathIndices[i];
        switchers[i].L <== i == 0 ? leaf : hashers[i - 1].out;
        switchers[i].R <== pathElements[i];
        hashers[i].inputs[0] <== switchers[i].outL;
        hashers[i].inputs[1] <== switchers[i].outR;
    }

    root === hashers[levels - 1].out;
}