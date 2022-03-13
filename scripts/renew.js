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
  ASSOCIATED_TOKEN_PROGRAM_ID,
} = require("@solana/spl-token");
const BN = require("bn.js");

const { findTokenHolder } = require("./utils/findTokenHolder");

const { user, mintKey } = require("./utils/keys.js");
const programId = new PublicKey("Fpwgc9Tq7k2nMzVxYqPWwKGA7FbCQwo2BgekpT69Cgbf");
const connection = new Connection("https://api.devnet.solana.com/");

const renewInstruction = (
  callerKey,
  subKey,
  depositMint,
  depositVault,
  payeeKey,
  payeeVault,
  callerVault,
  newMint,
  payerNewVault,
  payerOldVault,
  count,
  payer
) => {
  const accounts = [
    { pubkey: callerKey, isSigner: true, isWritable: true },
    { pubkey: subKey, isSigner: false, isWritable: true },
    { pubkey: depositMint, isSigner: false, isWritable: false },
    { pubkey: depositVault, isSigner: false, isWritable: true },
    { pubkey: payeeKey, isSigner: false, isWritable: false },
    { pubkey: payeeVault, isSigner: false, isWritable: true },
    { pubkey: callerVault, isSigner: false, isWritable: true },
    { pubkey: newMint, isSigner: false, isWritable: true },
    { pubkey: payerNewVault, isSigner: false, isWritable: true },
    { pubkey: payerOldVault, isSigner: false, isWritable: false },
    { pubkey: payer, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
  ];

  const idxBuffer = Buffer.from(new Uint8Array([3]));
  const countBuffer = Buffer.from(
    new Uint8Array(new BN(count).toArray("le", 8))
  );
  const inputData = Buffer.concat([idxBuffer, countBuffer]);

  const instruction = new TransactionInstruction({
    keys: accounts,
    programId: programId,
    data: inputData,
  });

  return instruction;
};

const findRenewAccounts = async (
  callerKey,
  mintKey,
  payeeKey,
  amount,
  duration,
  count,
  payer = null
) => {
  // subKey
  const [subKey, subBump] = await PublicKey.findProgramAddress(
    [
      Buffer.from("subscription_metadata"),
      payeeKey.toBuffer(),
      Buffer.from(new Uint8Array(new BN(amount).toArray("le", 8))),
      Buffer.from(new Uint8Array(new BN(duration).toArray("le", 8))),
      Buffer.from(new Uint8Array(new BN(count).toArray("le", 8))),
    ],
    programId
  );

  // depositVault
  const depositVault = await Token.getAssociatedTokenAddress(
    ASSOCIATED_TOKEN_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
    mintKey,
    subKey,
    true
  );

  // payeeVault
  const payeeVault = await Token.getAssociatedTokenAddress(
    ASSOCIATED_TOKEN_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
    mintKey,
    payeeKey,
    true
  );

  // callerVault
  const callerVault = await Token.getAssociatedTokenAddress(
    ASSOCIATED_TOKEN_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
    mintKey,
    callerKey,
    true
  );

  // newMint...need to define scheme
  const subAccount = await connection.getAccountInfo(subKey);
  const initialized = subAccount.data[1] === 1;

  const mintCount = initialized
    ? new BN(subAccount.data.slice(154, 162), (endian = "le"))
    : new BN(0);
  console.log("renewal/mint count:", mintCount);

  const [newMint, newMintBump] = await PublicKey.findProgramAddress(
    [
      Buffer.from("subscription_mint"),
      subKey.toBuffer(),
      Buffer.from(new Uint8Array(mintCount.toArray("le", 8))),
    ],
    programId
  );

  // get data from subKey account
  let payerNewVault;
  let payerOldVault;

  if (initialized) {
    // get mint and all that
    const currentMint = new PublicKey(subAccount.data.slice(2, 34));
    // need trace the token owner
    payer = await findTokenHolder(currentMint);
    console.log("currentMint:", currentMint.toBase58());
    console.log("payer:", payer.toBase58());

    payerNewVault = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      newMint,
      payer,
      true
    );

    payerOldVault = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      currentMint,
      payer,
      true
    );
  } else if (payer !== null) {
    // payerNewVault
    payerNewVault = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      newMint,
      payer,
      true
    );

    // payerOldVault
    payerOldVault = new Keypair().publicKey;
    if (initialized) {
      const currentMint = new PublicKey(subAccount.data.slice(2, 34));
      payerOldVault = await Token.getAssociatedTokenAddress(
        ASSOCIATED_TOKEN_PROGRAM_ID,
        TOKEN_PROGRAM_ID,
        currentMint,
        payer,
        true
      );
    }
  } else {
    throw "Not initialized and no payer provided";
  }

  return {
    subKey,
    depositVault,
    payeeVault,
    callerVault,
    newMint,
    payerNewVault,
    payerOldVault,
    payer,
  };
};

const main = async () => {
  let args = process.argv.slice(2);
  const payee = new PublicKey(args[0]);
  const amount = parseInt(args[1]);
  const duration = parseInt(args[2]);
  const count = parseInt(args[3]);

  // const payerTemp = user.publicKey;
  const payerTemp = new Keypair().publicKey;
  const caller = user;
  const {
    subKey,
    depositVault,
    payeeVault,
    callerVault,
    newMint,
    payerNewVault,
    payerOldVault,
    payer,
  } = await findRenewAccounts(
    caller.publicKey,
    mintKey,
    payee,
    amount,
    duration,
    count,
    payerTemp
  );

  const renewIx = renewInstruction(
    caller.publicKey,
    subKey,
    mintKey,
    depositVault,
    payee,
    payeeVault,
    callerVault,
    newMint,
    payerNewVault,
    payerOldVault,
    count,
    payer
  );

  const tx = new Transaction();
  tx.add(renewIx);

  const txid = await sendAndConfirmTransaction(connection, tx, [user], {
    skipPreflight: true,
    preflightCommitment: "confirmed",
    confirmation: "confirmed",
  });

  console.log(`https://explorer.solana.com/tx/${txid}?cluster=devnet`);
};

main()
  .then(() => {
    console.log("Success");
  })
  .catch((e) => {
    console.error(e);
  });
