'use client'

import { usePathname } from 'next/navigation'
import { ReactNode } from 'react'

export function BodyWrapper({ children }: { children: ReactNode }) {
    const pathname = usePathname()

    return (
        <body key={pathname} className={pathname == '/' ? 'bg-main-desktop' : 'bg-mixer-desktop'}>
            {children}
        </body>
    )
}
