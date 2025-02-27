#!/bin/bash

cd circuits

mkdir build

CIRCUIT="sukura"

if [ -f ./powersOfTau28_hez_final_15.ptau ]; then
    echo "powersOfTau28_hez_final_15.ptau already exists. Skipping."
else
    echo 'Downloading powersOfTau28_hez_final_15.ptau'
    wget https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_15.ptau
fi

echo "Compiling $CIRCUIT.circom..."

# compile circuit

circom $CIRCUIT.circom --r1cs --wasm --sym -o build
snarkjs r1cs info build/$CIRCUIT.r1cs

# Start a new zkey and make a contribution

snarkjs groth16 setup build/$CIRCUIT.r1cs powersOfTau28_hez_final_15.ptau build/circuit_0000.zkey
snarkjs zkey contribute build/circuit_0000.zkey build/sukura.zkey --name="1st Contributor Name" -v -e="random text"
snarkjs zkey export verificationkey build/sukura.zkey build/verification_key.json

# generate solidity contract
# snarkjs zkey export solidityverifier build/circuit_final.zkey ../$CIRCUITVerifier.sol

# snarkjs wtns calculate build/${CIRCUIT}_js/$CIRCUIT.wasm input.json witness.wtns

# snarkjs wtns check build/$CIRCUIT.r1cs witness.wtns

# snarkjs groth16 fullprove input.json build/${CIRCUIT}_js/$CIRCUIT.wasm build/circuit_final.zkey proof.json public.json

# snarkjs groth16 verify build/verification_key.json public.json proof.json

cd ../