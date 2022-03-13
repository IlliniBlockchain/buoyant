// This file is a sloppy attempt at recreating the
// solana block explorer functionality of finding
// the transfers involving a certain token
// and grabbing the latest one - this is used
// for finding the latest token holder of a
// subscription NFT. There's probably a much better
// way of doing this, but at the time it did not
// seem code from the explorer could be easily imported
// as an npm module, so I basically replicated
// similar functionality and imported what I needed.

const { Keypair, Connection, PublicKey } = require("@solana/web3.js");
const { type, any, Infer, string, create, optional, array, enums, coerce, instance, union, number } = require("superstruct");
const {
  Token,
} = require("@solana/spl-token");

const PublicKeyFromString = coerce(
  instance(PublicKey),
  string(),
  (value) => new PublicKey(value)
);

// type ParsedInfo = Infer<typeof ParsedInfo>;
const ParsedInfo = type({
  type: string(),
  info: any(),
});

// type TokenAmountUi = Infer<typeof TokenAmountUi>;
const TokenAmountUi = type({
  amount: string(),
  decimals: number(),
  uiAmountString: string(),
});

// type TokenInstructionType = Infer<typeof TokenInstructionType>;
const TokenInstructionType = enums([
  "initializeMint",
  "initializeAccount",
  "initializeMultisig",
  "transfer",
  "approve",
  "revoke",
  "setAuthority",
  "mintTo",
  "burn",
  "closeAccount",
  "freezeAccount",
  "thawAccount",
  "transfer2",
  "approve2",
  "mintTo2",
  "burn2",
  "transferChecked",
  "approveChecked",
  "mintToChecked",
  "burnChecked",
]);

// export type Transfer = Infer<typeof Transfer>;
const Transfer = type({
  source: PublicKeyFromString,
  destination: PublicKeyFromString,
  amount: union([string(), number()]),
  authority: optional(PublicKeyFromString),
  multisigAuthority: optional(PublicKeyFromString),
  signers: optional(array(PublicKeyFromString)),
});

// type TransferChecked = Infer<typeof TransferChecked>;
const TransferChecked = type({
  source: PublicKeyFromString,
  mint: PublicKeyFromString,
  destination: PublicKeyFromString,
  authority: optional(PublicKeyFromString),
  multisigAuthority: optional(PublicKeyFromString),
  signers: optional(array(PublicKeyFromString)),
  tokenAmount: TokenAmountUi,
});

// previously was trying to use an InstructionContainer class
// if that's any help for someone in the future reading this

function getTransfer(
  instruction,
) {
  if ("parsed" in instruction && instruction.program === "spl-token") {
    try {
      const { type: rawType } = instruction.parsed;
      const type = create(rawType, TokenInstructionType);

      // console.log("Instruction:", instruction);
      if (type === "transferChecked") {
        // return create(instruction.parsed.info, TransferChecked);
        // get mint from source
        // const tokenAccount = await Token.getAccountInfo(instruction.parsed.info.source);
        // instruction.parsed.info.mint = tokenAccount.mint;
        return instruction.parsed.info;
      } else if (type === "transfer") {
        // return create(instruction.parsed.info, Transfer);
        // get mint from source
        // const tokenAccount = await Token.getAccountInfo(instruction.parsed.info.source);
        // console.log(tokenAccount);
        // instruction.parsed.info.mint = tokenAccount.mint;
        return instruction.parsed.info;
      } else if (type === "mintTo") {
        return instruction.parsed.info;
      }
    } catch (error) {
    }
  }
  return undefined;
}

async function findTokenHolder(pubkey) {
  // const pubkey = new PublicKey("knonR4RcJ69UiSKZYBBonsvnciV4ZVKQ3dhmog6SzVw")
  const connection = new Connection("https://api.devnet.solana.com/");

  const largestAccounts = (await connection.getTokenLargestAccounts(pubkey)).value;
  // console.log(largestAccounts[0]);
  const accountInfo = await connection.getParsedAccountInfo(largestAccounts[0].address);
  // console.log(accountInfo);
  return new PublicKey(accountInfo.value.data.parsed.info.owner);

  const options = { limit: 1 };
  const MAX_TRANSACTION_BATCH_SIZE = 10

  const fetched = await connection.getConfirmedSignaturesForAddress2(
    pubkey,
    options,
  );
  const history = {
    fetched,
    foundOldest: fetched.length < options.limit,
  };

  const additionalSignatures = null;
  const transactionSignatures = history.fetched
    .map((signature) => signature.signature)
    .concat(additionalSignatures || []);

  const transactionMap = new Map();

  while (transactionSignatures.length > 0) {
    const signatures = transactionSignatures.splice(
      0,
      MAX_TRANSACTION_BATCH_SIZE
    );
    const fetched = await connection.getParsedTransactions(signatures);
    fetched.forEach(
      (parsed, index) => {
        if (parsed !== null) {
          transactionMap.set(signatures[index], parsed);
        }
      }
    );
  }

  let destination = null;
  // console.log(transactionMap);
  transactionMap.forEach((value, key) => {
    const instructions = value.transaction.message.instructions;
    const innerInstructions = value.meta.innerInstructions;
    // console.log(instructions);
    // console.log(innerInstructions);
    console.log("instructions:")
    instructions.forEach((instr) => {
      const transfer = getTransfer(instr);
      // console.log(transfer);
      if (transfer && transfer.mint == pubkey) {
        console.log(transfer);
        // console.log(transfer.destination.toBase58());
        // return (transfer.destination)
        if (destination === null) destination = transfer.destination;
      }
    })

    console.log("innerInstructions:")
    innerInstructions.forEach((instr) => {
      // console.log(instr.instructions);
      instr.instructions.forEach((innerInstr) => {
        const transfer = getTransfer(innerInstr);
        if (transfer && transfer.mint == pubkey) {
          console.log(transfer);
          // console.log(transfer.destination.toBase58());
          // return (transfer.destination)
          if (destination === null) destination = transfer.destination;
        }
      })
      // const transfer = getTransfer(instr);
      // console.log(transfer);
    })
  });

  // let transfers = [];
  // InstructionContainer.create(parsed).instructions.forEach(
  //   ({ instruction, inner }, index) => {
  //     const transfer = getTransfer(instruction, cluster, signature);
  //     if (transfer) {
  //       transfers.push(transfer);
  //     }
  //     inner.forEach((instruction, childIndex) => {
  //       const transfer = getTransfer(instruction, cluster, signature);
  //       if (transfer) {
  //         transfers.push(transfer);
  //       }
  //     });
  //   }
  // );
  return destination;

}

// main()
//   .then(() => {
//     console.log("Success");
//   })
//   .catch((e) => {
//     console.error(e);
//   });

module.exports = { findTokenHolder };