const {
  Connection,
  sendAndConfirmTransaction,
  Keypair,
  Transaction,
  PublicKey,
  TransactionInstruction,
} = require('@solana/web3.js')
const {
  Token,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} = require('@solana/spl-token')
const BN = require('bn.js')

const { findTokenHolder } = require('./utils/findTokenHolder')
const { user, mintKey } = require('./utils/keys')

const programId = new PublicKey('Fpwgc9Tq7k2nMzVxYqPWwKGA7FbCQwo2BgekpT69Cgbf')
const connection = new Connection('https://api.devnet.solana.com/')

function withdrawInstruction(
  payer,
  payerSubToken,
  payerDepositToken,
  depositVault,
  subMetadata,
  amount,
  count,
) {
  const accounts = [
    { pubkey: payer, isSigner: true, isWritable: true },
    { pubkey: payerSubToken, isSigner: false, isWritable: true },
    { pubkey: payerDepositToken, isSigner: false, isWritable: true },
    { pubkey: depositVault, isSigner: false, isWritable: true },
    { pubkey: subMetadata, isSigner: false, isWritable: false },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
  ]

  const idxBuffer = Buffer.from(new Uint8Array([3]))
  const amountBuffer = Buffer.from(new Uint8Array(new BN(amount).toArray('le', 8)))
  const countBuffer = Buffer.from(new Uint8Array(new BN(count).toArray('le', 8)))
  const inputData = Buffer.concat([idxBuffer, amountBuffer, countBuffer])

  return new TransactionInstruction({
    keys: accounts,
    programId,
    data: inputData,
  })
}

async function findWithdrawAccounts(
  callerKey,
  mintKey_,
  payeeKey,
  amount,
  duration,
  count,
  payer,
) {
  const [subKey, subBump] = await PublicKey.findProgramAddress(
    [
      Buffer.from('subscription_metadata'),
      payeeKey.toBuffer(),
      Buffer.from(new Uint8Array(new BN(amount).toArray('le', 8))),
      Buffer.from(new Uint8Array(new BN(duration).toArray('le', 8))),
      Buffer.from(new Uint8Array(new BN(count).toArray('le', 8))),
    ],
    programId,
  )

  // depositVault
  const depositVault = await Token.getAssociatedTokenAddress(
    ASSOCIATED_TOKEN_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
    mintKey_,
    subKey,
    true,
  )

  // callerVault
  const callerVault = await Token.getAssociatedTokenAddress(
    ASSOCIATED_TOKEN_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
    mintKey,
    callerKey,
    true,
  )

  return {
    subKey,
    depositVault,
    callerVault,
    payer,
  }
}

const findRenewAccounts = async (
  callerKey,
  mintKey_,
  payeeKey,
  amount,
  duration,
  count,
  payer = null,
) => {
  // subKey
  const [subKey, subBump] = await PublicKey.findProgramAddress(
    [
      Buffer.from('subscription_metadata'),
      payeeKey.toBuffer(),
      Buffer.from(new Uint8Array(new BN(amount).toArray('le', 8))),
      Buffer.from(new Uint8Array(new BN(duration).toArray('le', 8))),
      Buffer.from(new Uint8Array(new BN(count).toArray('le', 8))),
    ],
    programId,
  )

  // depositVault
  const depositVault = await Token.getAssociatedTokenAddress(
    ASSOCIATED_TOKEN_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
    mintKey,
    subKey,
    true,
  )

  // payeeVault
  const payeeVault = await Token.getAssociatedTokenAddress(
    ASSOCIATED_TOKEN_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
    mintKey,
    payeeKey,
    true,
  )

  // callerVault
  const callerVault = await Token.getAssociatedTokenAddress(
    ASSOCIATED_TOKEN_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
    mintKey,
    callerKey,
    true,
  )

  // newMint...need to define scheme
  const subAccount = await connection.getAccountInfo(subKey)
  const initialized = subAccount.data[1] === 1

  const mintCount = initialized
    ? new BN(subAccount.data.slice(154, 162), ('le'))
    : new BN(0)
  console.log('renewal/mint count:', mintCount)

  const [newMint, newMintBump] = await PublicKey.findProgramAddress(
    [
      Buffer.from('subscription_mint'),
      subKey.toBuffer(),
      Buffer.from(new Uint8Array(mintCount.toArray('le', 8))),
    ],
    programId,
  )

  // get data from subKey account
  let payerNewVault
  let payerOldVault

  if (initialized) {
    // get mint and all that
    const currentMint = new PublicKey(subAccount.data.slice(2, 34))
    // need trace the token owner
    payer = await findTokenHolder(currentMint)
    console.log('currentMint:', currentMint.toBase58())
    console.log('payer:', payer.toBase58())

    payerNewVault = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      newMint,
      payer,
      true,
    )

    payerOldVault = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      currentMint,
      payer,
      true,
    )
  } else if (payer !== null) {
    // payerNewVault
    payerNewVault = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      newMint,
      payer,
      true,
    )

    // payerOldVault
    payerOldVault = new Keypair().publicKey
    if (initialized) {
      const currentMint = new PublicKey(subAccount.data.slice(2, 34))
      payerOldVault = await Token.getAssociatedTokenAddress(
        ASSOCIATED_TOKEN_PROGRAM_ID,
        TOKEN_PROGRAM_ID,
        currentMint,
        payer,
        true,
      )
    }
  } else {
    throw new Error('Not initialized and no payer provided')
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
  }
}

async function main() {
  const args = process.argv.slice(2)
  const payee = new PublicKey(args[0])
  const amount = parseInt(args[1])
  const duration = parseInt(args[2])
  const count = parseInt(args[3])

  // const payerTemp = user.publicKey;
  const payerTemp = new Keypair().publicKey
  const caller = user
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
    payerTemp,
  )

  const withdrawIx = withdrawInstruction(
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
    payer,
  )

  const tx = new Transaction()
  tx.add(withdrawIx)

  const txid = await sendAndConfirmTransaction(connection, tx, [user], {
    skipPreflight: true,
    preflightCommitment: 'confirmed',
    confirmation: 'confirmed',
  })

  console.log(`https://explorer.solana.com/tx/${txid}?cluster=devnet`)
}

main()
  .then(() => console.log('Success'))
  .catch(console.error)
