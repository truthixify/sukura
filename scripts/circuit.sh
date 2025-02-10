#!/bin/bash

cd circuits

if [ -f ./powersOfTau28_hez_final_15.ptau ]; then
    echo "powersOfTau28_hez_final_15.ptau already exists. Skipping."
else
    echo 'Downloading powersOfTau28_hez_final_15.ptau'
    wget https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_15.ptau
fi

echo "Compiling Withdraw.circom..."

# compile circuit

circom Withdraw.circom --r1cs --wasm --sym -o build
snarkjs r1cs info build/Withdraw.r1cs

# Start a new zkey and make a contribution

snarkjs groth16 setup build/Withdraw.r1cs powersOfTau28_hez_final_15.ptau build/circuit_0000.zkey
snarkjs zkey contribute build/circuit_0000.zkey circuit_final.zkey --name="1st Contributor Name" -v -e="random text"
snarkjs zkey export verificationkey circuit_final.zkey verification_key.json

# generate solidity contract
snarkjs zkey export solidityverifier circuit_final.zkey ../contracts/Verifier.sol

cd ..