
// const { Subscription } = require("./dist/subscription");

const { Keypair, Connection, PublicKey } = require("@solana/web3.js");

// const {
//   Keypair, PublicKey,
// } = require("@solana/web3.js");

// const payee = new Keypair();
// console.log(payee.publicKey.toBase58());

// const sub = new Subscription(Buffer.from([]));

// const pubkey = new Keypair();


const { type, any, Infer, string, create, optional, array, enums, coerce, instance, union, number } = require("superstruct");

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

class InstructionContainer {
  // readonly instructions: InstructionItem[];

  static create(parsedTransaction) {
    return new InstructionContainer(parsedTransaction);
  }

  constructor(parsedTransaction) {
    this.instructions = parsedTransaction.transaction.message.instructions.map(
      (instruction) => {
        if ("parsed" in instruction) {
          if (typeof instruction.parsed === "object") {
            instruction.parsed = create(instruction.parsed, ParsedInfo);
          } else if (typeof instruction.parsed !== "string") {
            throw new Error("Unexpected parsed response");
          }
        }

        return {
          instruction,
          inner: [],
        };
      }
    );

    if (parsedTransaction.meta?.innerInstructions) {
      for (let inner of parsedTransaction.meta.innerInstructions) {
        this.instructions[inner.index].inner.push(...inner.instructions);
      }
    }
  }
}

function getTransfer(
  instruction,
) {
  if ("parsed" in instruction && instruction.program === "spl-token") {
    try {
      const { type: rawType } = instruction.parsed;
      const type = create(rawType, TokenInstructionType);

      if (type === "transferChecked") {
        return create(instruction.parsed.info, TransferChecked);
      } else if (type === "transfer") {
        console.log(instruction.parsed.info); // CHECKPOINT
        return create(instruction.parsed.info, Transfer);
      }
    } catch (error) {
    }
  }
  return undefined;
}

async function findTokenHolder(pubkey) {
  // const pubkey = new PublicKey("knonR4RcJ69UiSKZYBBonsvnciV4ZVKQ3dhmog6SzVw")
  const connection = new Connection("https://api.devnet.solana.com/");

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
      if (transfer) {
        // console.log(transfer.destination.toBase58());
        return (transfer.destination)
      }
    })
    console.log("innerInstructions:")
    innerInstructions.forEach((instr) => {
      // console.log(instr.instructions);
      instr.instructions.forEach((innerInstr) => {
        const transfer = getTransfer(innerInstr);
        if (transfer) {
          // console.log(transfer.destination.toBase58());
          return (transfer.destination)
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

}

// main()
//   .then(() => {
//     console.log("Success");
//   })
//   .catch((e) => {
//     console.error(e);
//   });

module.exports = { findTokenHolder };