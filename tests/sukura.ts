import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Sukura } from "../target/types/sukura"; // Adjust path if needed
import { assert } from "chai";
import snarkjs from "snarkjs";
import circomlibjs from "circomlibjs";
import crypto from "crypto";
import { unstringifyBigInts } from "ffjavascript";

const random_bigint = (num_bytes: number) => new anchor.BN(crypto.randomBytes(num_bytes));
// const pedersenHash = async () => await circomlibjs.buildPedersenHash();
const getRandomRecipient = () => anchor.web3.Keypair.generate().publicKey.toBase58();
const toFixedHex = (number: number, length = 32) => "0x" + new anchor.BN(number).toString(16).padStart(length * 2, "0")
const generateDeposit = async () => {
    let deposit = {
        secret: random_bigint(31),
        nullifier: random_bigint(31),
        commitment: new Uint8Array(),
    }

    const preimage = Buffer.concat([deposit.nullifier.toArrayLike(Buffer, "le", 32), deposit.secret.toArrayLike(Buffer, "le", 32)]);

    const pedersenHash = await circomlibjs.buildPedersenHash();

    deposit.commitment = pedersenHash.hash(preimage);

    return deposit;
}

const snarkVerify = async (input): Promise<boolean> => {
    const vkey = unstringifyBigInts(require("../assets/verification_key.json"));
    const wasm = unstringifyBigInts(require("../assets/Withdraw.wasm"));
    const zkey = unstringifyBigInts(require("../assets/withdraw.zkey"));

    const {proof, publicSignals} = await snarkjs.groth16.fullProve(input, wasm, zkey);

    return snarkjs.groth16.verify(vkey, publicSignals, proof)
}

describe("SukuraPool", () => {
  const provider = anchor.AnchorProvider.local();
  anchor.setProvider(provider);

  const program = anchor.workspace.Sukura as Program<Sukura>;
  const pool = anchor.web3.Keypair.generate();
  const authority = provider.wallet;

  const amountPerWithdrawal = new anchor.BN(1_000_000); // 1 SOL (adjust as needed)
  let commitment = anchor.web3.Keypair.generate().publicKey.toBase58();
  let nullifier = anchor.web3.Keypair.generate().publicKey.toBase58();

  it("Initializes the pool", async () => {
    await program.methods.initializePool(amountPerWithdrawal, {
      accounts: {
        pool: pool.publicKey,
        authority: authority.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      },
      signers: [pool],
    }).rpc();

    const poolAccount = await program.account.sukuraPool.fetch(pool.publicKey);
    assert.strictEqual(poolAccount.amountPerWithdrawal.toString(), amountPerWithdrawal.toString());
  });

  it("Deposits into the pool", async () => {
    await program.rpc.deposit(commitment, {
      accounts: {
        pool: pool.publicKey,
        authority: authority.publicKey,
      },
    });

    const poolAccount = await program.account.sukuraPool.fetch(pool.publicKey);
    assert.include(poolAccount.commitments, commitment);
  });

  it("Withdraws successfully with valid proof", async () => {
    let proof = Buffer.from([1, 2, 3, 4]); // Placeholder proof

    await program.rpc.withdraw(nullifier, proof, {
      accounts: {
        pool: pool.publicKey,
        recipient: authority.publicKey,
      },
    });

    const poolAccount = await program.account.sukuraPool.fetch(pool.publicKey);
    assert.include(poolAccount.nullifiers, nullifier);
  });

  it("Fails withdrawal with duplicate nullifier", async () => {
    let proof = Buffer.from([1, 2, 3, 4]); // Same proof as before

    try {
      await program.rpc.withdraw(nullifier, proof, {
        accounts: {
          pool: pool.publicKey,
          recipient: authority.publicKey,
        },
      });
      assert.fail("Withdrawal should have failed due to duplicate nullifier");
    } catch (err) {
      assert.include(err.message, "Nullifier already used");
    }
  });

  it("Fails withdrawal with invalid proof", async () => {
    let invalidProof = Buffer.from([]); // Empty proof (invalid)

    try {
      await program.rpc.withdraw(nullifier, invalidProof, {
        accounts: {
          pool: pool.publicKey,
          recipient: authority.publicKey,
        },
      });
      assert.fail("Withdrawal should have failed due to invalid proof");
    } catch (err) {
      assert.include(err.message, "Invalid proof");
    }
  });
});