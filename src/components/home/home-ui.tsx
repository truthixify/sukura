'use client'

import Image from 'next/image'
import { Button } from '../ui/ui-layout'
import Arc from '../../../public/whole-arc.svg'

export function Home() {
    return (
        <div className="flex items-center justify-center w-full h-1/2 absolute top-0 left-0">
            <Image
                className='absolute bottom-0'
                    src={Arc}
                    alt='arc'
            />
            <a href="/sukura" className='absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2'>
                <Button>Go to Mixer</Button>
            </a>
        </div>
    )
}