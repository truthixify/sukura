'use client'

import { useWallet } from '@solana/wallet-adapter-react'
import { WalletButton } from '../solana/solana-provider'
import { SukuraUi } from './sukura-ui'

export default function SukuraFeature() {
    const { publicKey } = useWallet()

    return (
        <>
            <div className="w-full h-full flex justify-center items-center relative">
                <SukuraUi />
            </div>
            {!publicKey && <div className="absolute top-0 left-0 w-screen h-screen flex flex-col items-center justify-center backdrop-blur-[10px] z-50">
            <WalletButton />
        </div>}
        </>
    )
}
