import * as anchor from '@coral-xyz/anchor'
import {Program} from '@coral-xyz/anchor'
import {Keypair} from '@solana/web3.js'
import {Sukura} from '../target/types/sukura'

describe('sukura', () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)
  const payer = provider.wallet as anchor.Wallet

  const program = anchor.workspace.Sukura as Program<Sukura>

  const sukuraKeypair = Keypair.generate()

  it('Initialize Sukura', async () => {
    await program.methods
      .initialize()
      .accounts({
        sukura: sukuraKeypair.publicKey,
        payer: payer.publicKey,
      })
      .signers([sukuraKeypair])
      .rpc()

    const currentCount = await program.account.sukura.fetch(sukuraKeypair.publicKey)

    expect(currentCount.count).toEqual(0)
  })

  it('Increment Sukura', async () => {
    await program.methods.increment().accounts({ sukura: sukuraKeypair.publicKey }).rpc()

    const currentCount = await program.account.sukura.fetch(sukuraKeypair.publicKey)

    expect(currentCount.count).toEqual(1)
  })

  it('Increment Sukura Again', async () => {
    await program.methods.increment().accounts({ sukura: sukuraKeypair.publicKey }).rpc()

    const currentCount = await program.account.sukura.fetch(sukuraKeypair.publicKey)

    expect(currentCount.count).toEqual(2)
  })

  it('Decrement Sukura', async () => {
    await program.methods.decrement().accounts({ sukura: sukuraKeypair.publicKey }).rpc()

    const currentCount = await program.account.sukura.fetch(sukuraKeypair.publicKey)

    expect(currentCount.count).toEqual(1)
  })

  it('Set sukura value', async () => {
    await program.methods.set(42).accounts({ sukura: sukuraKeypair.publicKey }).rpc()

    const currentCount = await program.account.sukura.fetch(sukuraKeypair.publicKey)

    expect(currentCount.count).toEqual(42)
  })

  it('Set close the sukura account', async () => {
    await program.methods
      .close()
      .accounts({
        payer: payer.publicKey,
        sukura: sukuraKeypair.publicKey,
      })
      .rpc()

    // The account should no longer exist, returning null.
    const userAccount = await program.account.sukura.fetchNullable(sukuraKeypair.publicKey)
    expect(userAccount).toBeNull()
  })
})
