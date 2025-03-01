'use client'

import { useWallet } from '@solana/wallet-adapter-react'
import { ExplorerLink } from '../cluster/cluster-ui'
import { WalletButton } from '../solana/solana-provider'
import { AppHero, ellipsify } from '../ui/ui-layout'
import { useSukuraProgram } from './sukura-data-access'
import { SukuraUi } from './sukura-ui'

export default function SukuraFeature() {
    const { publicKey } = useWallet()

    return publicKey ? (
        <div>
            <AppHero title="Sukura" subtitle={''}></AppHero>
            <SukuraUi />
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
