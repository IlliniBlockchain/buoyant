import {
  BUOYANT_PROGRAM_ID,
  SYSTEM_PROGRAM_ID,
  SYSVAR_RENT_PUBKEY,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "../constants";
import { BN } from "bn.js";
import { TransactionInstruction } from "@solana/web3.js";

export const initializeInstruction = (
  user,
  counterKey,
  subKey,
  depositVault,
  depositVaultMint,
  payeeKey,
  amount,
  duration
) => {
  const accounts = [
    { pubkey: user, isSigner: true, isWritable: true },
    { pubkey: counterKey, isSigner: false, isWritable: true },
    { pubkey: subKey, isSigner: false, isWritable: true },
    { pubkey: depositVault, isSigner: false, isWritable: true },
    { pubkey: depositVaultMint, isSigner: false, isWritable: false },
    { pubkey: SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
  ];

  const idxBuffer = Buffer.from(new Uint8Array([0]));
  const payeeBuffer = payeeKey.toBuffer();
  const amountBuffer = Buffer.from(
    new Uint8Array(new BN(amount).toArray("le", 8))
  );
  const durationBuffer = Buffer.from(
    new Uint8Array(new BN(duration).toArray("le", 8))
  );
  const inputData = Buffer.concat([
    idxBuffer,
    payeeBuffer,
    amountBuffer,
    durationBuffer,
  ]);

  const instruction = new TransactionInstruction({
    keys: accounts,
    programId: BUOYANT_PROGRAM_ID,
    data: inputData,
  });

  return instruction;
};
