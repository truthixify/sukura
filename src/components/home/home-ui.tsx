'use client'

import { Button } from '../ui/ui-layout'

export function Home() {
    return (
        <div className="flex items-center justify-center w-full absolute top-[50%] transform-transition translate-y-1/4 sm:-translate-y-1/2 lg:-translate-y-1/4">
            <Button>
                <a href="/sukura">Go to Mixer</a>
            </Button>
        </div>
    )
}
