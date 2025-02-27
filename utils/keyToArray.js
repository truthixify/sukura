import { Keypair } from '@solana/web3.js'

// Replace this with your private key (in base64 or as a Uint8Array)
const privateKey = '' // Example: '4d7176cbe25a5825cce911d8ea5c7e7d433d1c6e...'

// Convert the private key to a Uint8Array (if it's in base64 format)
const privateKeyArray = new Uint8Array(Buffer.from(privateKey, 'base64'))

// Or, if it's a simple array (for example, from the Solana CLI)
// const privateKeyArray = new Uint8Array([<your private key array>]);

console.log('Private Key Array:', privateKeyArray)
