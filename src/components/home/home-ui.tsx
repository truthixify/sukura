'use client'

import { Button } from '../ui/ui-layout'

export function Home() {
    return (
        <div className="flex items-center justify-center w-full absolute top-1/2 transform-transition translate-y-3/4 sm:translate-y-3/4 lg:translate-y-[100%]">
            <Button>
                <a href="/sukura">Go to Mixer</a>
            </Button>
        </div>
    )
}
