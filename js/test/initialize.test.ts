import * as mocha from "mocha";
import * as chai from "chai";
const expect = chai.expect;

import {
  Connection,
  sendAndConfirmTransaction,
  Keypair,
  Transaction,
  SystemProgram,
  PublicKey,
  TransactionInstruction,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import {
  getOrCreateFeePayer,
  getOrCreateMint,
  getOrCreateTokenAccount,
} from "./utils";
import { BN } from "bn.js";
import {
  getNewSubscriptionAddress,
  getSubscriptionCounterAddress,
  initializeInstruction,
} from "../src";
import { getAssociatedTokenAddress } from "@solana/spl-token";

describe("Initialize", () => {
  let connection: Connection;
  let feePayer: Keypair;
  let subscriptionCounter: PublicKey;
  let subscription: PublicKey;
  let depositMint: PublicKey;
  let depositVault: PublicKey;
  let payee: PublicKey;
  let amount: number;
  let duration: number;

  // Setup data to call ininitialize instruction
  before(async () => {
    connection = new Connection("https://api.devnet.solana.com/");
    feePayer = await getOrCreateFeePayer(connection);

    // subscription data
    payee = new Keypair().publicKey;
    amount = 200;
    duration = 60;

    // find PDAs and stuff
    subscriptionCounter = await getSubscriptionCounterAddress(
      payee,
      amount,
      duration
    );
    subscription = await getNewSubscriptionAddress(
      connection,
      payee,
      amount,
      duration
    );

    // need to figure out way to have defaults so it doesn't take forever
    depositMint = await getOrCreateMint(connection);
    depositVault = await getAssociatedTokenAddress(
      depositMint,
      subscription,
      true
    );
  });

  it("initialize", async () => {
    const initIx = initializeInstruction(
      feePayer.publicKey,
      subscriptionCounter,
      subscription,
      depositVault,
      depositMint,
      payee,
      amount,
      duration
    );

    const tx = new Transaction();
    tx.add(initIx);

    const txid = await sendAndConfirmTransaction(connection, tx, [feePayer], {
      skipPreflight: true,
      preflightCommitment: "confirmed",
      // confirmation: "confirmed",
    });

    console.log(`https://explorer.solana.com/tx/${txid}?cluster=devnet`);
  });
});
