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
  Token,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID
} = require("@solana/spl-token");
const BN = require("bn.js");

const { mintAuthority, user, mintKey } = require("./setup/keys.js");
const programId = new PublicKey("FdmChujE5rEhsvmTUvz1gbfoU3bKSWi52YuSqghNaDhj");
const connection = new Connection("https://api.devnet.solana.com/");

const initializeInstruction = (
  user,
  counterKey,
  subKey,
  depositVault,
  depositVaultMint,
  payeeKey,
  amount,
  duration,
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
  const amountBuffer = Buffer.from(new Uint8Array((new BN(amount)).toArray("le", 8)));
  const durationBuffer = Buffer.from(new Uint8Array((new BN(duration)).toArray("le", 8)));
  const inputData = Buffer.concat([idxBuffer, payeeBuffer, amountBuffer, durationBuffer]);

  
  const instruction = new TransactionInstruction({
    keys: accounts,
    programId: programId,
    data: inputData,
  });

  return instruction;

}

const findAccounts = async (userKey, payeeKey, amount, duration, mintKey) => {

  // get counter PDA
  const [ counterKey, counterBump ] = await PublicKey.findProgramAddress(
    [
      Buffer.from("subscription_counter"),
      payeeKey.toBuffer(),
      Buffer.from(new Uint8Array((new BN(amount)).toArray("le", 8))),
      Buffer.from(new Uint8Array((new BN(duration)).toArray("le", 8)))
    ],
    programId
  );

  // get count
  const account = (await connection.getAccountInfo(counterKey));
  const count = (account == null || account.data.length == 0) ? new BN(0) : new BN(account.data, endian = "le");
  console.log("count:", count);

  // get subscriptions metadata PDA
  // "subscription_metadata", user pubkey, payee
  const [ subKey, subBump ] = await PublicKey.findProgramAddress(
    [
      Buffer.from("subscription_metadata"),
      payeeKey.toBuffer(),
      Buffer.from(new Uint8Array((new BN(amount)).toArray("le", 8))),
      Buffer.from(new Uint8Array((new BN(duration)).toArray("le", 8))),
      Buffer.from(new Uint8Array(count.toArray("le", 8)))
    ],
    programId
  );


  // get associated token account
  const depositVault = await Token.getAssociatedTokenAddress(
    ASSOCIATED_TOKEN_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
    mintKey,
    subKey,
    true,
  );

  return {
    counterKey,
    subKey,
    depositVault,
  }

}

const main = async () => {
  let args = process.argv.slice(2);
  const payee = new PublicKey(args[0]);
  const amount = parseInt(args[1]);
  const duration = parseInt(args[2]);

  let { counterKey, subKey, depositVault } = await findAccounts(
    user.publicKey,
    payee,
    amount,
    duration,
    mintKey
  );

  const initIx = initializeInstruction(
    user.publicKey,
    counterKey,
    subKey,
    depositVault,
    mintKey,
    payee,
    amount,
    duration,
  );

  const tx = new Transaction();
  tx.add(initIx);

  const txid = await sendAndConfirmTransaction(
    connection,
    tx,
    [ user ],
    {
      skipPreflight: true,
      preflightCommitment: "confirmed",
      confirmation: "confirmed",
    }
  );

  console.log(`https://explorer.solana.com/tx/${txid}?cluster=devnet`);

  // run it again to make sure increments counter
  let accounts = await findAccounts(
    user.publicKey,
    payee,
    amount,
    duration,
    mintKey
  );
  let counterKey2 = accounts.counterKey;
  let subKey2 = accounts.subKey;
  let depositVault2 = accounts.depositVault;

  const initIx2 = initializeInstruction(
    user.publicKey,
    counterKey2,
    subKey2,
    depositVault2,
    mintKey,
    payee,
    amount,
    duration,
  );

  const tx2 = new Transaction();
  tx2.add(initIx2);

  const txid2 = await sendAndConfirmTransaction(
    connection,
    tx2,
    [ user ],
    {
      skipPreflight: true,
      preflightCommitment: "confirmed",
      confirmation: "confirmed",
    }
  );

  console.log(`https://explorer.solana.com/tx/${txid2}?cluster=devnet`);

}

main()
  .then(() => {
    console.log("Success");
  })
  .catch((e) => {
    console.error(e);
  });