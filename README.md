# ![Sukura](./public/SukuraLogo.svg) Sukura

Sukura is a **privacy-preserving** transaction mixer built on **Solana**. It enables users to deposit and withdraw funds anonymously by leveraging **zk-proofs**.

## 🔥 Features
- **Privacy-Preserving Transactions** – Uses ZKPs to ensure transactions remain confidential.
- **Solana Smart Contracts** – Efficient, low-cost on-chain interactions.
- **Relayer Support** – Withdraw funds without linking addresses.
- **Web3 Integration** – Works with wallets like Phantom and Solflare.
- **Fast & Scalable** – Built on Solana for high-speed transactions.

## 🛠 Tech Stack
- **Solana** – Blockchain infrastructure
- **Anchor** – Solana smart contract framework
- **Next.js** – Frontend & API routes
- **MongoDB** – Stores Merkle tree data
- **Mongoose** – ODM for MongoDB
- **Shyft API** – Transaction relayer & signer
- **Circom** – Used for generating zero-knowledge proofs.

---

## 🚀 Getting Started
### 1️⃣ Clone the Repository
```sh
 git clone https://github.com/truthixify/sukura.git
 cd sukura
```

### 2️⃣ Install Dependencies
```sh
npm install
```

### 3️⃣ Set Up Environment Variables
Create a **.env.local** file and configure it:
```sh
MONGODB_URI=<your_mongodb_connection_string>
API_KEY=<your_shyft_api_key>
NETWORK_URL=<solana_rpc_url>
NETWORK_URL=devnet # or mainnet
NODE_ENV=development # or production
```

### 4️⃣ Run the Development Server
```sh
npm run dev  # or yarn dev
```
Your Next.js app should now be running at `http://localhost:3000`

---

## 📜 How it Works

### 1️⃣ **Deposit Process**
1.	User Generates a Commitment
	- During deposit, a random secret is generated.
	- The Poseidon hash function is used to create a commitment hash.
2.	Commitment is Stored On-Chain
	- The commitment is submitted to the Solana smart contract.
	- The commitment is also stored off-chain in a Merkle tree (MongoDB).
3.	User Downloads a Note
	- After a successful deposit, the user downloads a “Note”.
	- The note contains the secret key and nullifier needed for withdrawal.

**Deposit Parameters:**
```typescript
{
    commitment: string // Unique commitment hash
}
```

### 2️⃣ **Withdrawal Process**
1.	User Uploads Their Note
	- To withdraw, the user must upload the Note downloaded during deposit.
	- This note contains the secret key used to prove ownership.
2.	Zero-Knowledge Proof is Generated
	- A ZK proof is created to verify the deposit without revealing its details.
	- The proof is submitted to the smart contract along with the Merkle root.
3.	Relayer Facilitates the Transaction
	- A relayer submits the withdrawal transaction on behalf of the user.
	- The withdrawal amount is sent to the recipient address without linking it to the original deposit.

**Withdrawal Parameters:**
```typescript
{
    nullifierHash: string // Prevents double spending
    root: string // Current Merkle tree root
    proof: any // Zero-knowledge proof
    publicSignals: any // Public inputs for verification
    fee: BN // Transaction fee
    recipientAddress: PublicKey // Address receiving the funds
    relayerWallet: PublicKey // Relayer handling the transaction
    vaultAddress: PublicKey // Vault holding the funds
}
```


---

## 🏗 Contributing
1. Fork the repo
2. Create a new branch (`git checkout -b feature/new-feature`)
3. Commit your changes (`git commit -m 'Add new feature'`)
4. Push the branch (`git push origin feature/new-feature`)
5. Open a pull request

---

## 📜 License
MIT License © 2025 **Sukura Team**

---

## 📬 Contact
- **Twitter**: [@truthixify](https://twitter.com/truthixify)
- **Email**: truthixify@gmail.com
