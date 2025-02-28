import 'dotenv/config'
import { Network, ShyftSdk } from '@shyft-to/js'

const shyft = new ShyftSdk({
    apiKey: process.env.API_KEY || ('pBGDMIBNQwSoU_3H' as string),
    network: Network.Devnet,
})

export const getOrCreateRelayerWallet = async () => {
    try {
        const wallet = await shyft.txnRelayer.getOrCreate()

        return wallet
    } catch (err) {
        throw new Error(err as string)
    }
}

export const signTransactinWithRelayer = async (encodedTransaction: string) => {
    try {
        const signature = await shyft.txnRelayer.sign({
            network: Network.Devnet,
            encodedTransaction,
        })

        return signature
    } catch (err) {
        throw new Error(err as string)
    }
}
