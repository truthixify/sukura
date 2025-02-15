import { utils } from 'ffjavascript';
const unstringifyBigInts = utils.unstringifyBigInts;
const stringifyBigInts = utils.stringifyBigInts;
const leInt2Buff = utils.leInt2Buff;
import * as snarkjs from 'snarkjs';
const FIELD_SIZE = BigInt(
    '21888242871839275222246405745257275088548364400416034343698204186575808495617'
);

export async function fullProve(proofInputs, wasmPath, zkeyPath) {
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        stringifyBigInts(proofInputs),
        wasmPath,
        zkeyPath
    );

    return {
        proof,
        publicSignals,
    };
}

export function parseProofToBytesArray(proof, compressed = false) {
    const mydata = proof;
    try {
        for (const i in mydata) {
            if (i == 'pi_a' || i == 'pi_c') {
                for (const j in mydata[i]) {
                    mydata[i][j] = Array.from(
                        leInt2Buff(unstringifyBigInts(mydata[i][j]), 32)
                    ).reverse();
                }
            } else if (i == 'pi_b') {
                for (const j in mydata[i]) {
                    for (const z in mydata[i][j]) {
                        mydata[i][j][z] = Array.from(
                            leInt2Buff(unstringifyBigInts(mydata[i][j][z]), 32)
                        );
                    }
                }
            }
        }

        if (compressed) {
            const proofA = mydata.pi_a[0];
            // negate proof by reversing the bitmask
            const proofAIsPositive = yElementIsPositiveG1(
                BigInt(mydata.pi_a[1])
            )
                ? false
                : true;
            proofA[0] = addBitmaskToByte(proofA[0], proofAIsPositive);
            const proofB = mydata.pi_b[0].flat().reverse();
            const proofBY = mydata.pi_b[1].flat().reverse();
            const proofBIsPositive = yElementIsPositiveG2(
                BigInt(
                    '0x' + Buffer.from(proofBY.slice(0, 32)).toString('hex')
                ),
                BigInt(
                    '0x' + Buffer.from(proofBY.slice(32, 64)).toString('hex')
                )
            );
            proofB[0] = addBitmaskToByte(proofB[0], proofBIsPositive);
            const proofC = mydata.pi_c[0];
            const proofCIsPositive = yElementIsPositiveG1(
                BigInt(mydata.pi_c[1])
            );
            proofC[0] = addBitmaskToByte(proofC[0], proofCIsPositive);
            return {
                proofA,
                proofB,
                proofC,
            };
        }
        return {
            proofA: [mydata.pi_a[0], mydata.pi_a[1]].flat(),
            proofB: [
                mydata.pi_b[0].flat().reverse(),
                mydata.pi_b[1].flat().reverse(),
            ].flat(),
            proofC: [mydata.pi_c[0], mydata.pi_c[1]].flat(),
        };
    } catch (error) {
        console.error('Error while parsing the proof.', error.message);
        throw error;
    }
}

export function parseToBytesArray(publicSignals) {
    try {
        const publicInputsBytes = new Array();
        for (const i in publicSignals) {
            const ref = Array.from([
                ...leInt2Buff(unstringifyBigInts(publicSignals[i]), 32),
            ]).reverse();
            publicInputsBytes.push(ref);
        }

        return publicInputsBytes;
    } catch (error) {
        console.error('Error while parsing public inputs.', error.message);
        throw error;
    }
}

function yElementIsPositiveG1(yElement) {
    return yElement <= FIELD_SIZE - yElement;
}

function yElementIsPositiveG2(yElement1, yElement2) {
    const fieldMidpoint = FIELD_SIZE / BigInt(2);

    // Compare the first component of the y coordinate
    if (yElement1 < fieldMidpoint) {
        return true;
    } else if (yElement1 > fieldMidpoint) {
        return false;
    }

    // If the first component is equal to the midpoint, compare the second component
    return yElement2 < fieldMidpoint;
}

function addBitmaskToByte(byte, yIsPositive) {
    if (!yIsPositive) {
        return (byte |= 1 << 7);
    } else {
        return byte;
    }
}
