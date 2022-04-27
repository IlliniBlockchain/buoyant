import { Keypair, PublicKey, Connection } from "@solana/web3.js";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";

let feePayer = Keypair.fromSecretKey(
  Uint8Array.from([
    44, 152, 71, 225, 202, 62, 208, 47, 99, 134, 230, 216, 213, 131, 173, 213,
    212, 88, 90, 155, 56, 58, 19, 239, 123, 109, 247, 86, 204, 24, 144, 41, 125,
    186, 203, 180, 161, 170, 86, 140, 91, 88, 166, 154, 109, 45, 126, 83, 127,
    68, 221, 128, 232, 89, 172, 151, 48, 20, 46, 138, 147, 122, 230, 97,
  ])
);
const balanceThreshold = 1e5; // arbitrary/temporary
let mint = new PublicKey("Cj1wxenWnRGb7LwRb1zdDiJStTNrJWtipoA2nHtTrsim");
const mintDecimals = 9;
let tokenAccount: PublicKey;
const tokenBalanceThreshold = 1 * 10 ** (mintDecimals - 4); // arbitrary/temporary

// gets or creates/airdrops static feePayer to be used across tests
export const getOrCreateFeePayer = async (
  connection: Connection
): Promise<Keypair> => {
  try {
    const balance = await connection.getBalance(feePayer.publicKey);
    if (balance < balanceThreshold) {
      const airdropTx = await connection.requestAirdrop(
        feePayer.publicKey,
        2e9
      );
      // await connection.confirmTransaction(airdropTx, "finalized");
    }
  } catch (err) {
    console.log(err);
    console.log(
      "If you've run into an error saying 'failed to get balance of account', just try to run it again."
    );
  }
  return feePayer;
};

// gets or creates a static mint governed by feePayer to be used across tests
export const getOrCreateMint = async (
  connection: Connection
): Promise<PublicKey> => {
  if (!feePayer) {
    throw new Error("feePayer needs to be initialized.");
  }
  if (!mint) {
    mint = await createMint(
      connection,
      feePayer,
      feePayer.publicKey,
      null,
      mintDecimals
    );
  }
  return mint;
};

export const getOrCreateTokenAccount = async (
  connection: Connection
): Promise<PublicKey> => {
  if (!feePayer || !mint) {
    throw new Error("feePayer and mint need to be initialized.");
  }
  if (!tokenAccount) {
    tokenAccount = (
      await getOrCreateAssociatedTokenAccount(
        connection,
        feePayer,
        mint,
        feePayer.publicKey
      )
    ).address;
  }
  await fillTokenAccountIfNeeded(connection);
  return tokenAccount;
};

export const fillTokenAccountIfNeeded = async (connection: Connection) => {
  try {
    const balance =
      (await connection.getTokenAccountBalance(tokenAccount)).value.uiAmount *
      10 ** mintDecimals;
    if (balance < tokenBalanceThreshold) {
      await mintTo(
        connection,
        feePayer,
        mint,
        tokenAccount,
        feePayer,
        2 * 10 ** mintDecimals
      );
    }
  } catch (err) {
    console.log(err);
    console.log(
      "If you've run into an error saying 'failed to get balance of token account', just try to run it again."
    );
  }
};
