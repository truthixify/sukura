import {
    fullProve,
    parseProofToBytesArray,
    parseToBytesArray,
} from './parse_proof_to_rust.js';
import { parseVk } from './parse_vk_to_rust.js';
import fs from 'fs';

export async function generateRustVerifier() {
    const wasmPath = process.argv[2];
    const zkeyPath = process.argv[3];
    const proofInputPath = process.argv[4];
    const verifyingKeyInputPath = process.argv[5];
    if (!wasmPath || !zkeyPath || !proofInputPath || !verifyingKeyInputPath) {
        const err = `error: missing required arguments

Usage: 
  node ./utils/generate_verifier.js <wasm_file> <zkey_file> <input_json> <verification_key_json>

Arguments:
  <wasm_file>              Path to the hash.wasm file
  <zkey_file>              Path to the circuit_final.zkey file
  <input_json>             Path to the input.json file
  <verification_key_json>  Path to the verification_key.json file

Example:
  node ./utils/generate_verifier.js ./hash.wasm ./circuit_final.zkey ./input.json ./verification_key.json

For more information, try '--help'`;
        throw new Error(err);
    }

    const outputPath = process.argv[6]
        ? `${process.argv[6]}/verifier.rs`
        : 'verifier.rs';

    const proofInputFile = fs.readFileSync(proofInputPath, 'utf8');
    const proofInputs = JSON.parse(proofInputFile);

    const verifyingKeyInputFile = fs.readFileSync(
        verifyingKeyInputPath,
        'utf8'
    );
    const verifyingKeyJson = JSON.parse(verifyingKeyInputFile);

    // const { proof, publicSignals } = await fullProve(
    //     proofInputs,
    //     wasmPath,
    //     zkeyPath
    // );

    // let proofArr = parseProofToBytesArray(proof);
    // proofArr = [...proofArr.proofA, ...proofArr.proofB, ...proofArr.proofC];
    // const publicSignalsArr = parseToBytesArray(publicSignals);
    const verifyingKey = await parseVk(verifyingKeyJson);

    const rustVerifier = `use ark_serialize::{CanonicalDeserialize, CanonicalSerialize, Compress, Validate};
use groth16_solana::{groth16::{Groth16Verifier, Groth16Verifyingkey}, errors::Groth16Error};
use std::ops::Neg;
type G1 = ark_bn254::g1::G1Affine;

const VERIFYINGKEY: Groth16Verifyingkey = ${verifyingKey};

fn chunk_instruction_data(data: &[u8]) -> Vec<[u8; 32]> {
    data.chunks(32)
        .map(|chunk| {
            let mut array = [0u8; 32];
            array[..chunk.len()].copy_from_slice(chunk);
            array
        })
        .collect()
}

fn change_endianness(bytes: &[u8]) -> Vec<u8> {
    let mut vec = Vec::new();
    for b in bytes.chunks(32) {
        for byte in b.iter().rev() {
            vec.push(*byte);
        }
    }
    vec
}

pub fn verify_proof(data: &[u8]) -> Result<bool, Groth16Error> {
    let proof_a: G1 = G1::deserialize_with_mode(
        &*[&change_endianness(&data[0..64]), &[0u8][..]].concat(),
        Compress::No,
        Validate::Yes,
    )
    .map_err(|_| Groth16Error::DecompressingG1Failed)?;
    let mut proof_a_neg = [0u8; 65];
    proof_a
        .neg()
        .x
        .serialize_with_mode(&mut proof_a_neg[..32], Compress::No)
        .map_err(|_| Groth16Error::DecompressingG1Failed)?;
    proof_a
        .neg()
        .y
        .serialize_with_mode(&mut proof_a_neg[32..], Compress::No)
        .map_err(|_| Groth16Error::DecompressingG1Failed)?;

    let proof_a: [u8; 64] = change_endianness(&proof_a_neg[..64]).try_into().map_err(|_| Groth16Error::InvalidG1Length)?;
    let proof_b = &data[64..192]
        .try_into().map_err(|_| Groth16Error::InvalidG2Length)?;
    let proof_c = &data[192..256]
        .try_into().map_err(|_| Groth16Error::InvalidG1Length)?;
    let public_signals: [[u8; 32]; 1] = chunk_instruction_data(&data[256..])
        .try_into().map_err(|_| Groth16Error::InvalidPublicInputsLength)?;

    let mut verifier =
        Groth16Verifier::new(&proof_a, proof_b, proof_c, &public_signals, &VERIFYINGKEY).map_err(|_| Groth16Error::ProofVerificationFailed)?;
        
    verifier.verify()
}
`;

    // const testRustProofAndPublicInput = `const PROOF: [u8; 256] = [${proofArr}];

// const PUBLIC_SIGNALS: [[u8; 32]; 1] = [[${publicSignalsArr}]];`;

    fs.writeFileSync(outputPath, rustVerifier);
    // fs.writeFileSync('proof.rs', testRustProofAndPublicInput);
    console.log(
        '✅ Rust verifier written to',
        outputPath,
        'and test rust proof and public input written to proof.rs'
    );
}

generateRustVerifier();
