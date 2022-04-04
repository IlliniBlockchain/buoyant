const {
  Token,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} = require('@solana/spl-token')
const {
  Connection,
  sendAndConfirmTransaction,
  Keypair,
  Transaction,
  SystemProgram,
  PublicKey,
  TransactionInstruction,
  SYSVAR_RENT_PUBKEY,
} = require('@solana/web3.js')
const BN = require('bn.js')

const { BUOYANT_ADDRESS, SOLANA_DEVNET } = require('./utils/constant')
const { user, mintKey, userTokenAccount } = require('./utils/keys')

const programId = new PublicKey(BUOYANT_ADDRESS)
const connection = new Connection(SOLANA_DEVNET)

function getInstructionAccounts([
  payer,
  payerSubToken,
  payerDepositToken,
  depositVault,
  subMetadata,
]) {
  return [
    { pubkey: payer, isSigner: true, isWritable: true },
    { pubkey: payerSubToken, isSigner: false, isWritable: true },
    { pubkey: payerDepositToken, isSigner: false, isWritable: true },
    { pubkey: depositVault, isSigner: false, isWritable: true },
    { pubkey: subMetadata, isSigner: false, isWritable: false },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
  ]
}

async function findInstructionAccounts({
  callerKey,
  mintKey_,
  payeeKey,
  amount,
  duration,
  count,
  payer = null,
}) {
  // subscription metdata (no need for bump)
  const [subMetaKey] = await PublicKey.findProgramAddress(
    [
      Buffer.from('subscription_metadata'),
      payeeKey.toBuffer(),
      Buffer.from(new Uint8Array(new BN(amount).toArray('le', 8))),
      Buffer.from(new Uint8Array(new BN(duration).toArray('le', 8))),
      Buffer.from(new Uint8Array(new BN(count).toArray('le', 8))),
    ],
    programId,
  )

  // deposit vault
  const depositVault = await Token.getAssociatedTokenAddress(
    ASSOCIATED_TOKEN_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
    mintKey_,
    subMetaKey,
    true,
  )

  // payer vault
  const payerVault = await Token.getAssociatedTokenAddress(
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

  return getInstructionAccounts([
    // NOTE: payer or caller?
    payer, // `[writable, signer]` payer
    callerVault, // `[writable]` (PDA) payer subscription token account
    mintKey_, //  `[writable]` (PDA) payer deposit token account
    depositVault, // `[writable]` (PDA) deposit vault
    subMetaKey, // `[]` (PDA) subscription metadata
  ])
}

function withdrawInstruction(accounts, count) {
  const idxBuffer = Buffer.from(new Uint8Array([3]))
  const countBuffer = Buffer.from(
    new Uint8Array(new BN(count).toArray('le', 8)),
  )
  const inputData = Buffer.concat([idxBuffer, countBuffer])

  const instruction = new TransactionInstruction({
    keys: accounts,
    programId,
    data: inputData,
  })

  return instruction
}

const main = async () => {
  const args = process.argv.slice(2)
  const payee = new PublicKey(args[0])
  const amount = parseInt(args[1])
  const duration = parseInt(args[2])
  const count = parseInt(args[3])
  const depositAmount = parseInt(args[4])

  const [subKey, subBump] = await PublicKey.findProgramAddress(
    [
      Buffer.from('subscription_metadata'),
      payee.toBuffer(),
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

  const transferIx = Token.createTransferInstruction(
    TOKEN_PROGRAM_ID,
    userTokenAccount,
    depositVault,
    user.publicKey,
    [],
    depositAmount,
  )

  const transferTx = new Transaction()
  transferTx.add(transferIx)

  const txid = await sendAndConfirmTransaction(connection, transferTx, [user], {
    skipPreflight: true,
    preflightCommitment: 'confirmed',
    confirmation: 'confirmed',
  })

  console.log(`https://explorer.solana.com/tx/${txid}?cluster=devnet`)
}

(async () => {
  const args = process.argv.slice(2)
  const payee = new PublicKey(args[0])
  const [amount, duration, count] = args.slice(1).map(parseInt)

  const payerTemp = new Keypair().publicKey // user.publicKey
  const caller = user

  const accounts = await findInstructionAccounts({
    callerKey: caller.publicKey,
    mintKey_: mintKey,
    payeeKey: payee,
    amount,
    duration,
    count,
    payer: payerTemp,
  })

  const withdrawIx = withdrawInstruction(accounts, count)
  const tx = new Transaction()
  tx.add(withdrawIx)

  const txid = await sendAndConfirmTransaction(connection, tx, [user], {
    skipPreflight: true,
    preflightCommitment: 'confirmed',
    confirmation: 'confirmed',
  })

  console.log(`https://explorer.solana.com/tx/${txid}?cluster=devnet`)
})()

main()
  .then(() => {
    console.log('Success')
  })
  .catch((e) => {
    console.error(e)
  })
