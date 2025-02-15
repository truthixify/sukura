import { utils } from 'ffjavascript';
const { unstringifyBigInts, leInt2Buff } = utils;

export async function parseVk(data) {
    for (var i in data) {
        if (i == 'vk_alpha_1') {
            for (var j in data[i]) {
                data[i][j] = leInt2Buff(
                    unstringifyBigInts(data[i][j]),
                    32
                ).reverse();
            }
        } else if (i == 'vk_beta_2') {
            for (var j in data[i]) {
                let tmp = Array.from(
                    leInt2Buff(unstringifyBigInts(data[i][j][0]), 32)
                )
                    .concat(
                        Array.from(
                            leInt2Buff(unstringifyBigInts(data[i][j][1]), 32)
                        )
                    )
                    .reverse();
                data[i][j][0] = tmp.slice(0, 32);
                data[i][j][1] = tmp.slice(32, 64);
            }
        } else if (i == 'vk_gamma_2') {
            for (var j in data[i]) {
                let tmp = Array.from(
                    leInt2Buff(unstringifyBigInts(data[i][j][0]), 32)
                )
                    .concat(
                        Array.from(
                            leInt2Buff(unstringifyBigInts(data[i][j][1]), 32)
                        )
                    )
                    .reverse();
                data[i][j][0] = tmp.slice(0, 32);
                data[i][j][1] = tmp.slice(32, 64);
            }
        } else if (i == 'vk_delta_2') {
            for (var j in data[i]) {
                let tmp = Array.from(
                    leInt2Buff(unstringifyBigInts(data[i][j][0]), 32)
                )
                    .concat(
                        Array.from(
                            leInt2Buff(unstringifyBigInts(data[i][j][1]), 32)
                        )
                    )
                    .reverse();
                data[i][j][0] = tmp.slice(0, 32);
                data[i][j][1] = tmp.slice(32, 64);
            }
        } else if (i == 'vk_alphabeta_12') {
            for (var j in data[i]) {
                for (var z in data[i][j]) {
                    for (var u in data[i][j][z]) {
                        data[i][j][z][u] = leInt2Buff(
                            unstringifyBigInts(data[i][j][z][u])
                        );
                    }
                }
            }
        } else if (i == 'IC') {
            for (var j in data[i]) {
                for (var z in data[i][j]) {
                    data[i][j][z] = leInt2Buff(
                        unstringifyBigInts(data[i][j][z]),
                        32
                    ).reverse();
                }
            }
        }
    }

    let s = `Groth16Verifyingkey {\n\tnr_pubinputs: ${data.IC.length},\n\n`;
    s += '\tvk_alpha_g1: [\n';
    for (var j = 0; j < data.vk_alpha_1.length - 1; j++) {
        s +=
            '\t\t' +
            Array.from(data.vk_alpha_1[j]) /*.reverse().toString()*/ +
            ',\n';
    }
    s += '\t],\n\n';
    s += '\tvk_beta_g2: [\n';
    for (var j = 0; j < data.vk_beta_2.length - 1; j++) {
        for (var z = 0; z < 2; z++) {
            s += '\t\t' + Array.from(data.vk_beta_2[j][z]) + ',\n';
        }
    }
    s += '\t],\n\n';
    s += '\tvk_gamme_g2: [\n';
    for (var j = 0; j < data.vk_gamma_2.length - 1; j++) {
        for (var z = 0; z < 2; z++) {
            s += '\t\t' + Array.from(data.vk_gamma_2[j][z]) + ',\n';
        }
    }
    s += '\t],\n\n';

    s += '\tvk_delta_g2: [\n';
    for (var j = 0; j < data.vk_delta_2.length - 1; j++) {
        for (var z = 0; z < 2; z++) {
            s += '\t\t' + Array.from(data.vk_delta_2[j][z]) + ',\n';
        }
    }
    s += '\t],\n\n';
    s += '\tvk_ic: &[\n';
    let x = 0;

    for (var ic in data.IC) {
        s += '\t\t[\n';
        for (var j = 0; j < data.IC[ic].length - 1; j++) {
            s += '\t\t\t' + data.IC[ic][j] + ',\n';
        }
        x++;
        s += '\t\t],\n';
    }
    s += '\t]\n}';

    return s;
}
