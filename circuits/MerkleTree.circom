pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/poseidon.circom";
include "../node_modules/circomlib/circuits/comparators.circom";
include "../node_modules/circomlib/circuits/switcher.circom"; 

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

template MerkleTreeInclusionProof(n) {
    signal input leaf;
    signal input path_elements[n];
    signal input path_index[n]; // path index are 0's and 1's indicating whether the current element is on the left or right
    signal output root; // note that this is an OUTPUT signal

    component hasher[n];
    component switcher[n];

    var hash = leaf;

    for (var i = 0; i < n; i++) {
        hasher[i] = Poseidon(2);
        switcher[i] = Switcher();

        switcher[i].sel <== path_index[i];
        switcher[i].L <== hash;
        switcher[i].R <== path_elements[i];
        hasher[i].inputs[0] <== switcher[i].outL;
        hasher[i].inputs[1] <== switcher[i].outR;

        hash = hasher[i].out;
    }

    root <== hash;
}