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

const { mintAuthority, user } = require("./keys.js");
const connection = new Connection("https://api.devnet.solana.com/");

const initTokens = async () => {

  // create/get mints
  console.log("Creating mint1...");
  const mintDecimals = 6;
  const mint = await Token.createMint(
    connection,
    mintAuthority,
    mintAuthority.publicKey,
    mintAuthority.publicKey,
    mintDecimals,
    TOKEN_PROGRAM_ID,
  );

  // create/get user token accounts
  console.log("Getting/creating user token accounts...");
  const userTokenAccount = await mint.getOrCreateAssociatedAccountInfo(
    user.publicKey,
  );

  const user2TokenAccount = await mint.getOrCreateAssociatedAccountInfo(
    new PublicKey("FKiVnXRfi4nb6YGuvE4HSv851vnMwAkTDhzPY4TYQzT8"),
  );

  // mint tokens to user
  console.log("Minting tokens to user...");
  await mint.mintTo(
    userTokenAccount.address,
    mintAuthority.publicKey,
    [],
    100 * (10 ** mintDecimals),
  );
  await mint.mintTo(
    user2TokenAccount.address,
    mintAuthority.publicKey,
    [],
    100 * (10 ** mintDecimals),
  );

  console.log("mint pubkey:", mint.publicKey.toBase58());
  console.log("userTokenAccount:", userTokenAccount.address.toBase58());

}

initTokens()
  .then(() => {
    console.log("Success");
  })
  .catch((e) => {
    console.error(e);
  });
