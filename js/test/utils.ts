import { Keypair, PublicKey, Connection } from "@solana/web3.js";
import { createMint, getOrCreateAssociatedTokenAccount } from '@solana/spl-token';

let feePayer: Keypair = Keypair.fromSecretKey(
    Uint8Array.from([
    223,  52, 148,  85,  28, 155, 106,  92,   3,  46, 191,
    36,  31, 102, 121, 244,  67, 157,  21, 194,   8, 143,
    89, 172, 121, 103, 130,  92, 140, 151, 101,  13, 199,
    156, 243, 214, 180, 153, 125,  75, 246, 191, 194,  14,
    48, 220, 100,  94,  67,  68, 134,  91, 108, 117, 213,
    40, 205,  29, 230, 207, 220, 238, 187, 103
    ])
);
const balanceThreshold = 1e5; // arbitrary/temporary
let mint: PublicKey;
const mintDecimals = 9;
let tokenAccount: PublicKey;

// gets or creates/airdrops static feePayer to be used across tests
export const getOrCreateFeePayer = async (connection: Connection): Promise<Keypair> => {
    if (!feePayer) {
        feePayer = new Keypair();
    }
    const balance = await connection.getBalance(feePayer.publicKey);
    if (balance < balanceThreshold) {
        const airdropTx = await connection.requestAirdrop(feePayer.publicKey, 2e9);
        // await connection.confirmTransaction(airdropTx, "finalized");
    }
    return feePayer;
}

// gets or creates a static mint governed by feePayer to be used across tests
export const getOrCreateMint = async (connection: Connection): Promise<PublicKey> => {
    if (!feePayer) {
        throw new Error('feePayer needs to be initialized.');
    }
    if (!mint) {
        mint = await createMint(connection, feePayer, feePayer.publicKey, null, mintDecimals);
    }
    return mint;
}

export const getOrCreateTokenAccount = async (connection: Connection): Promise<PublicKey> => {
    if (!feePayer || !mint) {
        throw new Error('feePayer and mint need to be initialized.');
    }
    if (!tokenAccount) {
        tokenAccount = (await getOrCreateAssociatedTokenAccount(
            connection,
            feePayer,
            mint,
            feePayer.publicKey,
        )).address;
    }
    return tokenAccount;
}