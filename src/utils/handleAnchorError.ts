export function handleAnchorError(err: any) {
    console.log(err, 'hoo', err.message)
    if (err.message.includes('Custom')) {
        const match = err.message.match(/Custom":(\d+)/)
        if (match) {
            const errorCode = parseInt(match[1], 10)

            switch (errorCode) {
                case 6000:
                    return 'Commitment already exists'
                case 6001:
                    return 'Nullifier already used'
                case 6002:
                    return 'Merkle root not found'
                case 6003:
                    return 'Invalid proof provided for withdrawal'
                case 6003:
                    return 'Invalid proof provided for withdrawal'
                default:
                    return 'Transaction failed'
            }
        }
    }
}
