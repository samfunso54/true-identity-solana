import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  clusterApiUrl,
} from "@solana/web3.js";

const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

/**
 * Generates a SHA-256 hash of identity verification data.
 */
export async function generateVerificationHash(walletAddress: string): Promise<string> {
  const data = JSON.stringify({
    wallet: walletAddress,
    timestamp: Date.now(),
    type: "liveness_verification",
  });
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(data));
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export interface StoreHashResult {
  signature: string;
  hash: string;
  explorerUrl: string;
}

/**
 * Stores a verification hash on Solana using the Memo program.
 * Requires a connected wallet to sign the transaction.
 */
export async function storeHashOnSolana(
  hash: string,
  publicKey: PublicKey,
  signTransaction: (tx: Transaction) => Promise<Transaction>
): Promise<StoreHashResult> {
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

  const memoData = JSON.stringify({
    type: "vdi_verification",
    hash,
    version: "1.0",
  });

  const instruction = new TransactionInstruction({
    keys: [{ pubkey: publicKey, isSigner: true, isWritable: false }],
    programId: MEMO_PROGRAM_ID,
    data: Buffer.from(memoData),
  });

  const transaction = new Transaction().add(instruction);
  transaction.feePayer = publicKey;
  transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

  const signed = await signTransaction(transaction);
  const signature = await connection.sendRawTransaction(signed.serialize());
  await connection.confirmTransaction(signature, "confirmed");

  return {
    signature,
    hash,
    explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
  };
}
