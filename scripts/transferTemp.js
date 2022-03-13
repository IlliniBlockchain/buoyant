// this function just transfers a subscription nft to a specified address
// always comes from the pre-assigned user from keys.js because that's
// who we have a signer for

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
  getOrCreate
} = require("@solana/spl-token");
const BN = require("bn.js");

const { user, mintKey } = require("./utils/keys.js");
const programId = new PublicKey("Fpwgc9Tq7k2nMzVxYqPWwKGA7FbCQwo2BgekpT69Cgbf");
const connection = new Connection("https://api.devnet.solana.com/");

const betterCreateAssociatedTokenAccountInstruction = (ata, payer, owner, mint) => {

  const accounts = [
    { pubkey: payer, isSigner: true, isWritable: true },
    { pubkey: ata, isSigner: false, isWritable: true },
    { pubkey: owner, isSigner: false, isWritable: false },
    { pubkey: mint, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
  ];

  const instruction = new TransactionInstruction({
    keys: accounts,
    programId: ASSOCIATED_TOKEN_PROGRAM_ID,
    data: Buffer.from([]),
  });

  return instruction;
}

const main = async () => {
  let args = process.argv.slice(2);
  const payee = new PublicKey(args[0]);
  const amount = parseInt(args[1]);
  const duration = parseInt(args[2]);
  const count = parseInt(args[3]);
  const receiver = new PublicKey(args[4]);

  console.log("user:", user.publicKey.toBase58());

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

  console.log("subKey:", subKey.toBase58());

  // sub token mint key
  const subAccount = await connection.getAccountInfo(subKey);
  const initialized = subAccount.data[1] === 1;

  const mintCount = initialized
    ? new BN(subAccount.data.slice(154, 162), (endian = "le")).isubn(1)
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
  console.log("newMint:", newMint.toBase58());

  // user token vault
  const userSubTokenAccount = await Token.getAssociatedTokenAddress(
    ASSOCIATED_TOKEN_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
    newMint,
    user.publicKey,
    true,
  );

  console.log("userSubTokenAccount:", userSubTokenAccount.toBase58())

  // receiver token vault (create)
  const receiverSubTokenAccount = await Token.getAssociatedTokenAddress(
    ASSOCIATED_TOKEN_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
    newMint,
    receiver,
    true,
  );

  // const ataIx = betterCreateAssociatedTokenAccountInstruction(
  //   receiverSubTokenAccount,
  //   user.publicKey,
  //   receiver,
  //   newMint,
  // );

  const ataIx = Token.createAssociatedTokenAccountInstruction(
    ASSOCIATED_TOKEN_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
    newMint,
    receiverSubTokenAccount,
    receiver,
    user.publicKey
  );

  const transferIx = Token.createTransferInstruction(
    TOKEN_PROGRAM_ID,
    userSubTokenAccount,
    receiverSubTokenAccount,
    user.publicKey,
    [],
    1
  );

  const transferTx = new Transaction();
  transferTx.add(ataIx).add(transferIx);

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
