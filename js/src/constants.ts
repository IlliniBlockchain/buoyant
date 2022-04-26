import { PublicKey, SystemProgram } from "@solana/web3.js";

// Note: This is only devnet at the moment
export const BUOYANT_PROGRAM_ID = new PublicKey('Fpwgc9Tq7k2nMzVxYqPWwKGA7FbCQwo2BgekpT69Cgbf');

// Re-export
export { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';
export { SYSVAR_RENT_PUBKEY } from '@solana/web3.js';

export const SYSTEM_PROGRAM_ID = SystemProgram.programId;