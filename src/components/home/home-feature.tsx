'use client'

import { Home } from './home-ui'
import { AppHero } from '../ui/ui-layout'

export default function HomeFeature() {
    return (
        <div className="relative h-full">
            <AppHero
                title="Untraceable Transactions, Absolute Privacy"
                subtitle={
                    ''
                }
            ></AppHero>
            <Home />
        </div>
    )
}

//Built for those who value financial freedom, Sukura obfuscates transaction trails, making it impossible to trace your funds. Stay anonymous, stay secure, stay ahead
