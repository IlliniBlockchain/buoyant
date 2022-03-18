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
  // getAssociatedTokenAddress,
  // createTransferInstruction,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} = require("@solana/spl-token");
const { getAssociatedTokenAddress, createTransferInstruction } = Token;
const BN = require("bn.js");
const { Buffer } = require("buffer");

const programId = new PublicKey("Fpwgc9Tq7k2nMzVxYqPWwKGA7FbCQwo2BgekpT69Cgbf");

const unpackSubscription = (data) => {

  const active = data[0] === 1;
  const mint = data[1] === 1 ? new PublicKey(data.slice(2, 34)) : null;
  const offset = data[1] === 1 ? 32 : 0;
  const start = {
    depositVault: 2 + offset,
    depositMint: 34 + offset,
    payee: 66 + offset,
    amount: 98 + offset,
    duration: 106 + offset,
    nextRenewTime: 114 + offset,
    renewalCount: 122 + offset,
  };
  const size = {
    depositVault: 32,
    depositMint: 32,
    payee: 32,
    amount: 8,
    duration: 8,
    nextRenewTime: 8,
    renewalCount: 8,
  };

  const depositVault = new PublicKey(data.slice(start.depositVault, start.depositVault + size.depositVault))
  const depositMint = new PublicKey(data.slice(start.depositMint, start.depositMint + size.depositMint))
  const payee = new PublicKey(data.slice(start.payee, start.payee + size.payee))
  const amount = new BN(data.slice(start.amount, start.amount + size.amount), "le")
  const duration = new BN(data.slice(start.duration, start.duration + size.duration), "le")
  const nextRenewTime = new BN(data.slice(start.nextRenewTime, start.nextRenewTime + size.nextRenewTime), "le")
  const renewalCount = new BN(data.slice(start.renewalCount, start.renewalCount + size.renewalCount), "le")

  return {
    active,
    mint,
    depositVault,
    depositMint,
    payee,
    amount,
    duration,
    nextRenewTime,
    renewalCount,
  }
}

const findInitializeAccounts = async (
  connection,
  payeeKey,
  amount,
  duration,
  mintKey
) => {
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
    ASSOCIATED_TOKEN_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
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
  let { counterKey, subKey, depositVault } = await findInitializeAccounts(
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

const getDepositInstruction = async (connection, user, subKey, amount) => {
  const subAccount = await connection.getAccountInfo(subKey);
  const initialized = subAccount.data[1] === 1;

  const depositVault = !initialized
    ? new PublicKey(subAccount.data.slice(2, 34))
    : new PublicKey(subAccount.data.slice(34, 66));
  console.log("depositVault", depositVault.toBase58());

  const depositMint = !initialized
    ? new PublicKey(subAccount.data.slice(34, 66))
    : new PublicKey(subAccount.data.slice(66, 98));
  console.log("depositMint", depositMint.toBase58());

  const userDepositVault = await getAssociatedTokenAddress(
    ASSOCIATED_TOKEN_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
    depositMint,
    user
  );
  console.log("userDepositVault", userDepositVault.toBase58());

  const depositIx = createTransferInstruction(
    TOKEN_PROGRAM_ID,
    userDepositVault,
    depositVault,
    user,
    [],
    amount
  );

  return depositIx;

  // export declare function createTransferCheckedInstruction(source: PublicKey, mint: PublicKey, destination: PublicKey, owner: PublicKey, amount: number | bigint, decimals: number, multiSigners?: Signer[], programId?: PublicKey): TransactionInstruction;
};

async function findTokenHolder(connection, mintKey) {

  const largestAccounts = (await connection.getTokenLargestAccounts(mintKey))
    .value;
  const accountInfo = await connection.getParsedAccountInfo(
    largestAccounts[0].address
  );
  return new PublicKey(accountInfo.value.data.parsed.info.owner);

}

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
  connection,
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

  console.log("subKey:", subKey.toBase58());

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
    ? new BN(subAccount.data.slice(154, 162), "le")
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
    payer = await findTokenHolder(connection, currentMint);
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

const getRenewInstruction = async (connection, subKey, subOwner, caller) => {
  // get seeds from account info
  const subAccount = await connection.getAccountInfo(subKey);
  console.log(subAccount);
  const subData = unpackSubscription(subAccount.data);
  const { depositVault, depositMint, payee, amount, duration } = subData;
  console.log(subData);

  // get counter
  const [counterKey, counterBump] = await PublicKey.findProgramAddress(
    [
      Buffer.from("subscription_counter"),
      payee.toBuffer(),
      Buffer.from(new Uint8Array(new BN(amount).toArray("le", 8))),
      Buffer.from(new Uint8Array(new BN(duration).toArray("le", 8))),
    ],
    programId
  );
  //asdfasdf
  const account = await connection.getAccountInfo(counterKey);
  const totalCount =
    account == null || account.data.length == 0
      ? new BN(0)
      : new BN(account.data, "le");
  console.log("totalCount:", totalCount);

  // loop through counter to find count
  let count;
  for (count = 0; count < totalCount; count += 1) {
    const [pda, bump] = await PublicKey.findProgramAddress(
      [
        Buffer.from("subscription_metadata"),
        payee.toBuffer(),
        Buffer.from(new Uint8Array(new BN(amount).toArray("le", 8))),
        Buffer.from(new Uint8Array(new BN(duration).toArray("le", 8))),
        Buffer.from(new Uint8Array(new BN(count).toArray("le", 8))),
      ],
      programId
    );
    if (pda.toBase58() == subKey.toBase58()) {
      break;
    }
  }
  console.log("count:", count);

  // use previously defined helpers
  const {
    payeeVault,
    callerVault,
    newMint,
    payerNewVault,
    payerOldVault,
    payer,
  } = await findRenewAccounts(
    connection,
    caller,
    depositMint,
    payee,
    amount,
    duration,
    count,
    subOwner
  );

  subOwner = payer;

  const renewIx = renewInstruction(
    caller,
    subKey,
    depositMint,
    depositVault,
    payee,
    payeeVault,
    callerVault,
    newMint,
    payerNewVault,
    payerOldVault,
    count,
    subOwner
  );

  return renewIx;
}

module.exports = { getInitializeInstruction, getDepositInstruction, getRenewInstruction, unpackSubscription, findTokenHolder };
