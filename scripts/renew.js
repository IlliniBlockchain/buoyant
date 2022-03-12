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

const { findTokenHolder } = require('./utils/findTokenHolder');

const { mintAuthority, user, mintKey } = require("./utils/keys.js");
const programId = new PublicKey("Fpwgc9Tq7k2nMzVxYqPWwKGA7FbCQwo2BgekpT69Cgbf");
const connection = new Connection("https://api.devnet.solana.com/");

const renewInstruction = (
  callerKey,
  subKey,
  depositVault,
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
    { pubkey: depositVault, isSigner: false, isWritable: true },
    { pubkey: payeeVault, isSigner: false, isWritable: true },
    { pubkey: callerVault, isSigner: false, isWritable: true },
    { pubkey: newMint, isSigner: false, isWritable: true },
    { pubkey: payerNewVault, isSigner: false, isWritable: true },
    { pubkey: payerOldVault, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
  ];

  const idxBuffer = Buffer.from(new Uint8Array([3]));
  const countBuffer = Buffer.from(
    new Uint8Array(new BN(count).toArray("le", 8))
  );
  const payerBuffer = payer.toBuffer();
  const inputData = Buffer.concat([idxBuffer, countBuffer, payerBuffer]);

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
  payer = null,
) => {

  // subKey
  const [ subKey, subBump ] = await PublicKey.findProgramAddress(
    [
      Buffer.from("subscription_metadata"),
      payeeKey.toBuffer(),
      Buffer.from(new Uint8Array((new BN(amount)).toArray("le", 8))),
      Buffer.from(new Uint8Array((new BN(duration)).toArray("le", 8))),
      Buffer.from(new Uint8Array((new BN(count)).toArray("le", 8)))
    ],
    programId
  );

  // depositVault
  const depositVault = await Token.getAssociatedTokenAddress(
    ASSOCIATED_TOKEN_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
    mintKey,
    subKey,
    true,
  );

  // payeeVault
  const payeeVault = await Token.getAssociatedTokenAddress(
    ASSOCIATED_TOKEN_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
    mintKey,
    payeeKey,
    true,
  );

  // callerVault
  const callerVault = await Token.getAssociatedTokenAddress(
    ASSOCIATED_TOKEN_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
    mintKey,
    callerKey,
    true,
  );

  // newMint...need to define scheme
  const subAccount = (await connection.getAccountInfo(subKey));
  // console.log(subAccount.data.length);
  // subAccount.data.forEach((val, idx) => console.log(idx, val));
  const mintCount = new BN(subAccount.data.slice(154, 162));

  const [ newMint, newMintBump ] = await PublicKey.findProgramAddress(
    [
      Buffer.from("subscription_mint"),
      subKey.toBuffer(),
      Buffer.from(new Uint8Array(mintCount.toArray("le", 8))),
    ],
    programId
  );

  // get data from subKey account
  const initialized = subAccount.data[1] === 1;
  let payerNewVault;
  let payerOldVault;
  if (payer !== null) {

    // payerNewVault
    payerNewVault = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      newMint,
      payer,
      true,
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
        true,
      );
    }

  } else if (initialized) {

    // get mint and all that
    const currentMint = new PublicKey(subAccount.data.slice(2, 34));
    // need to use explorer or smth to trace the token owner
    payer = await findTokenHolder(currentMint);

    payerNewVault = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      newMint,
      payer,
      true,
    );

    payerOldVault = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      currentMint,
      payer,
      true,
    );

  } else {
    throw 'Not initialized and no payer provided';
  }

  return {
    subKey,
    depositVault,
    payeeVault,
    callerVault,
    newMint,
    payerNewVault,
    payerOldVault,
    payer
  };
};

const main = async () => {
  
  let args = process.argv.slice(2);
  const payee = new PublicKey(args[0]);
  const amount = parseInt(args[1]);
  const duration = parseInt(args[2]);
  const count = parseInt(args[3]);

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
    payer
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
    depositVault,
    payeeVault,
    callerVault,
    newMint,
    payerNewVault,
    payerOldVault,
    count,
    payer,
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
