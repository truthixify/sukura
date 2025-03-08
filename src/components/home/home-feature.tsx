'use client'

import { useWallet } from '@solana/wallet-adapter-react'
import { WalletButton } from '../solana/solana-provider'
import { Home } from './home-ui'
import { AppHero } from '../ui/ui-layout'

export default function HomeFeature() {
    const { publicKey } = useWallet()

    return publicKey ? (
        <div className="relative h-full">
            <AppHero title="the fully decentralized non-custodial protocol" subtitle={''}></AppHero>
            <Home />
        </div>
    ) : (
        <div className="max-w-4xl mx-auto">
            <div className="hero py-[64px]">
                <div className="hero-content text-center">
                    <WalletButton />
                </div>
            </div>
        </div>
    )
}
