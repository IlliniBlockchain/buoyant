const {
  Connection,
  sendAndConfirmTransaction,
  Keypair,
  Transaction,
  SystemProgram,
  PublicKey,
  TransactionInstruction,
  SYSVAR_RENT_PUBKEY,
} = require("@solana/web3.js");
const {
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} = require("@solana/spl-token");
const BN = require("bn.js");
const { Buffer } = require("buffer");

const programId = new PublicKey("Fpwgc9Tq7k2nMzVxYqPWwKGA7FbCQwo2BgekpT69Cgbf");

const findAccounts = async (connection, payeeKey, amount, duration, mintKey) => {
  // get counter PDA
  const [counterKey, counterBump] = await PublicKey.findProgramAddress(
    [
      Buffer.from("subscription_counter"),
      payeeKey.toBuffer(),
      Buffer.from(new Uint8Array(new BN(amount).toArray("le", 8))),
      Buffer.from(new Uint8Array(new BN(duration).toArray("le", 8))),
    ],
    programId
  );

  // get count
  const account = await connection.getAccountInfo(counterKey);
  const count =
    account == null || account.data.length == 0
      ? new BN(0)
      : new BN(account.data, "le");
  console.log("count:", count);

  // get subscriptions metadata PDA
  // "subscription_metadata", user pubkey, payee
  const [subKey, subBump] = await PublicKey.findProgramAddress(
    [
      Buffer.from("subscription_metadata"),
      payeeKey.toBuffer(),
      Buffer.from(new Uint8Array(new BN(amount).toArray("le", 8))),
      Buffer.from(new Uint8Array(new BN(duration).toArray("le", 8))),
      Buffer.from(new Uint8Array(count.toArray("le", 8))),
    ],
    programId
  );

  // get associated token account

  const depositVault = await getAssociatedTokenAddress(
    mintKey,
    subKey,
    true
  );

  return {
    counterKey,
    subKey,
    depositVault,
  };
};

const initializeInstruction = (
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
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
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
    programId: programId,
    data: inputData,
  });

  return instruction;
};

const getInitializeInstruction = async (
  connection,
  user,
  payee,
  amount,
  duration,
  depositMint
) => {
  let { counterKey, subKey, depositVault } = await findAccounts(
    connection,
    payee,
    amount,
    duration,
    depositMint
  );

  const initIx = initializeInstruction(
    user,
    counterKey,
    subKey,
    depositVault,
    depositMint,
    payee,
    amount,
    duration
  );

  return initIx;
};

module.exports = { getInitializeInstruction };
