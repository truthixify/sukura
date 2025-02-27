import { utils } from 'ffjavascript'
const { unstringifyBigInts, leInt2Buff } = utils
import * as fs from 'fs'

export async function parseVk(data) {
    let nPublic
    for (var i in data) {
        if (i == 'nPublic') {
            nPublic = data[i]
        } else if (i == 'vk_alpha_1') {
            for (var j in data[i]) {
                data[i][j] = leInt2Buff(unstringifyBigInts(data[i][j]), 32).reverse()
            }
        } else if (i == 'vk_beta_2') {
            for (var j in data[i]) {
                let tmp = Array.from(leInt2Buff(unstringifyBigInts(data[i][j][0]), 32))
                    .concat(Array.from(leInt2Buff(unstringifyBigInts(data[i][j][1]), 32)))
                    .reverse()
                data[i][j][0] = tmp.slice(0, 32)
                data[i][j][1] = tmp.slice(32, 64)
            }
        } else if (i == 'vk_gamma_2') {
            for (var j in data[i]) {
                let tmp = Array.from(leInt2Buff(unstringifyBigInts(data[i][j][0]), 32))
                    .concat(Array.from(leInt2Buff(unstringifyBigInts(data[i][j][1]), 32)))
                    .reverse()
                data[i][j][0] = tmp.slice(0, 32)
                data[i][j][1] = tmp.slice(32, 64)
            }
        } else if (i == 'vk_delta_2') {
            for (var j in data[i]) {
                let tmp = Array.from(leInt2Buff(unstringifyBigInts(data[i][j][0]), 32))
                    .concat(Array.from(leInt2Buff(unstringifyBigInts(data[i][j][1]), 32)))
                    .reverse()
                data[i][j][0] = tmp.slice(0, 32)
                data[i][j][1] = tmp.slice(32, 64)
            }
        } else if (i == 'vk_alphabeta_12') {
            for (var j in data[i]) {
                for (var z in data[i][j]) {
                    for (var u in data[i][j][z]) {
                        data[i][j][z][u] = leInt2Buff(unstringifyBigInts(data[i][j][z][u]))
                    }
                }
            }
        } else if (i == 'IC') {
            for (var j in data[i]) {
                for (var z in data[i][j]) {
                    data[i][j][z] = leInt2Buff(unstringifyBigInts(data[i][j][z]), 32).reverse()
                }
            }
        }
    }

    let s = `Groth16Verifyingkey {\n\tnr_pubinputs: ${data.IC.length},\n\n`
    s += '\tvk_alpha_g1: [\n'
    for (var j = 0; j < data.vk_alpha_1.length - 1; j++) {
        s += '\t\t' + Array.from(data.vk_alpha_1[j]) /*.reverse().toString()*/ + ',\n'
    }
    s += '\t],\n\n'
    s += '\tvk_beta_g2: [\n'
    for (var j = 0; j < data.vk_beta_2.length - 1; j++) {
        for (var z = 0; z < 2; z++) {
            s += '\t\t' + Array.from(data.vk_beta_2[j][z]) + ',\n'
        }
    }
    s += '\t],\n\n'
    s += '\tvk_gamme_g2: [\n'
    for (var j = 0; j < data.vk_gamma_2.length - 1; j++) {
        for (var z = 0; z < 2; z++) {
            s += '\t\t' + Array.from(data.vk_gamma_2[j][z]) + ',\n'
        }
    }
    s += '\t],\n\n'

    s += '\tvk_delta_g2: [\n'
    for (var j = 0; j < data.vk_delta_2.length - 1; j++) {
        for (var z = 0; z < 2; z++) {
            s += '\t\t' + Array.from(data.vk_delta_2[j][z]) + ',\n'
        }
    }
    s += '\t],\n\n'
    s += '\tvk_ic: &[\n'
    let x = 0

    for (var ic in data.IC) {
        s += '\t\t[\n'
        for (var j = 0; j < data.IC[ic].length - 1; j++) {
            s += '\t\t\t' + data.IC[ic][j] + ',\n'
        }
        x++
        s += '\t\t],\n'
    }
    s += '\t]\n}'

    return { s, nPublic }
}

async function main() {
    const verifyingKeyInputPath = process.argv[2]
    if (!verifyingKeyInputPath) {
        throw new Error('error: missing path')
    }

    const outputPath = process.argv[6] ? `${process.argv[6]}/verifier.rs` : 'verifier.rs'
    const verifyingKeyInputFile = fs.readFileSync(verifyingKeyInputPath, 'utf8')
    const verifyingKeyJson = JSON.parse(verifyingKeyInputFile)

    const { s, nPublic } = await parseVk(verifyingKeyJson)

    const rustVerifier = `use groth16_solana::{
    decompression::{decompress_g1, decompress_g2}, errors::Groth16Error, groth16::{Groth16Verifier, Groth16Verifyingkey}
};

const VERIFYINGKEY: Groth16Verifyingkey = ${s};


fn chunk_instruction_data(data: &[u8]) -> Vec<[u8; 32]> {
    data.chunks(32)
        .map(|chunk| {
            let mut array = [0u8; 32];
            array[..chunk.len()].copy_from_slice(chunk);
            array
        })
        .collect()
}

pub fn verify_proof(data: &[u8]) -> Result<bool, Groth16Error> {
    let proof_a: &[u8; 32] = &data[..32].try_into().unwrap();
    let proof_b: &[u8; 64] = &data[32..96].try_into().unwrap();
    let proof_c: &[u8; 32] = &data[96..128].try_into().unwrap();

    let proof_a = decompress_g1(proof_a).map_err(|_| Groth16Error::DecompressingG1Failed)?;
    let proof_b = decompress_g2(proof_b).map_err(|_| Groth16Error::DecompressingG2Failed)?;
    let proof_c = decompress_g1(proof_c).map_err(|_| Groth16Error::DecompressingG1Failed)?;

    let public_signals: [[u8; 32]; ${nPublic}] = chunk_instruction_data(&data[128..])
        .try_into()
        .map_err(|_| Groth16Error::InvalidPublicInputsLength)?;

    let mut verifier =
        Groth16Verifier::new(&proof_a, &proof_b, &proof_c, &public_signals, &VERIFYINGKEY)
            .map_err(|_| Groth16Error::ProofVerificationFailed)?;

    verifier.verify()
}
`

    fs.writeFileSync(outputPath, rustVerifier)
    console.log('✅ Rust verifier written to', outputPath)
}

main().catch((err) => console.log(err))
