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

const {
  mintAuthority,
  user,
  mintKey,
  userTokenAccount,
} = require("./utils/keys.js");
const programId = new PublicKey("Fpwgc9Tq7k2nMzVxYqPWwKGA7FbCQwo2BgekpT69Cgbf");
const connection = new Connection("https://api.devnet.solana.com/");

const main = async () => {
  let args = process.argv.slice(2);
  const payee = new PublicKey(args[0]);
  const amount = parseInt(args[1]);
  const duration = parseInt(args[2]);
  const count = parseInt(args[3]);
  const depositAmount = parseInt(args[4]);

  const [subKey, subBump] = await PublicKey.findProgramAddress(
    [
      Buffer.from("subscription_metadata"),
      payee.toBuffer(),
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

  const transferIx = Token.createTransferInstruction(
    TOKEN_PROGRAM_ID,
    userTokenAccount,
    depositVault,
    user.publicKey,
    [],
    depositAmount
  );

  const transferTx = new Transaction();
  transferTx.add(transferIx);

  const txid = await sendAndConfirmTransaction(connection, transferTx, [user], {
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
