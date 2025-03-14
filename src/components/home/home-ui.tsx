'use client'

import { Button, useTransactionToast } from '../ui/ui-layout'

export function Home() {
    const txs = useTransactionToast()
    return (
        <div className="flex items-center justify-center w-full absolute top-[50%] transform-transition sm:-translate-y-3/4 lg:-translate-y-3/4">
            <Button>
                <a href="/sukura">Go to Mixer</a>
            </Button>
            {txs("hdbshsihbsh")}
        </div>
    )
}
