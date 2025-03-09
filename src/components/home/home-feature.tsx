'use client'

import { Home } from './home-ui'
import { AppHero } from '../ui/ui-layout'

export default function HomeFeature() {
    return (
        <div className="relative h-full">
            <AppHero title="the fully decentralized non-custodial protocol" subtitle={''}></AppHero>
            <Home />
        </div>
    )
}
