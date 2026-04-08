import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  clusterApiUrl,
} from "@solana/web3.js";

const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

/**
 * Generates a cryptographically random nonce to prevent replay attacks.
 */
function generateNonce(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Generates a SHA-256 hash of identity verification data.
 * Includes a nonce to prevent replay attacks and challenge proof
 * to bind the hash to a completed liveness session.
 */
export async function generateVerificationHash(
  walletAddress: string,
  challengeProof: string
): Promise<{ hash: string; nonce: string }> {
  const nonce = generateNonce();
  const data = JSON.stringify({
    wallet: walletAddress,
    nonce,
    challengeProof,
    timestamp: Date.now(),
    type: "liveness_verification",
    version: "1.0",
  });
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(data));
  const hash = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return { hash, nonce };
}

export interface StoreHashResult {
  signature: string;
  hash: string;
  nonce: string;
  explorerUrl: string;
}

/**
 * Validates a hash string is a valid hex SHA-256 hash (64 chars).
 */
function isValidHash(hash: string): boolean {
  return /^[a-f0-9]{64}$/.test(hash);
}

/**
 * Stores a verification hash on Solana using the Memo program.
 * Requires a connected wallet to sign the transaction.
 *
 * Security notes:
 * - The wallet adapter handles signing; private keys never touch this code.
 * - The nonce in memo data prevents identical transactions from being replayed.
 * - Only the hash is stored on-chain — no PII is ever written to the blockchain.
 */
export async function storeHashOnSolana(
  hash: string,
  nonce: string,
  publicKey: PublicKey,
  signTransaction: (tx: Transaction) => Promise<Transaction>
): Promise<StoreHashResult> {
  // Validate hash format before submitting on-chain
  if (!isValidHash(hash)) {
    throw new Error("Invalid hash format");
  }

  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

  // Only store the hash and nonce on-chain — never PII or raw identity data
  const memoData = JSON.stringify({
    type: "vdi_verification",
    hash,
    nonce,
    version: "1.0",
  });

  // Enforce max memo size to prevent abuse (Memo program allows up to 566 bytes)
  const memoBytes = new TextEncoder().encode(memoData);
  if (memoBytes.length > 500) {
    throw new Error("Memo data exceeds safe size limit");
  }

  const instruction = new TransactionInstruction({
    keys: [{ pubkey: publicKey, isSigner: true, isWritable: false }],
    programId: MEMO_PROGRAM_ID,
    data: new TextEncoder().encode(memoData),
  });

  const transaction = new Transaction().add(instruction);
  transaction.feePayer = publicKey;

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
  transaction.recentBlockhash = blockhash;

  const signed = await signTransaction(transaction);
  const signature = await connection.sendRawTransaction(signed.serialize(), {
    skipPreflight: false,
    preflightCommitment: "confirmed",
  });

  // Use blockhash-based confirmation to detect expiry
  await connection.confirmTransaction(
    { signature, blockhash, lastValidBlockHeight },
    "confirmed"
  );

  return {
    signature,
    hash,
    nonce,
    explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
  };
}
