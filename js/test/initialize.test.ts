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
import BN from "bn.js";

describe("Initialize", () => {
  // beforeEach(function (done) {
  // this.timeout(15000); // A very long environment setup.
  // setTimeout(done, 5000);
  // });

  let connection: Connection;
  let feePayer: Keypair;
  let subscriptionCounter: PublicKey;
  let subscription: PublicKey;
  let depositMint: PublicKey;
  let depositVault: PublicKey;
  let payee: PublicKey;
  let amount: number;
  let duration: number;

  before(async () => {
    connection = new Connection("https://api.devnet.solana.com/");
    feePayer = await getOrCreateFeePayer(connection);

    // need to figure out way to have defaults so it doesn't take forever
    depositMint = await getOrCreateMint(connection);
    depositVault = await getOrCreateTokenAccount(connection);

    // find PDAs and stuff

    payee = new Keypair().publicKey;
    amount = 200;
    duration = 60;
  });

  it("initialize", () => {});
});
