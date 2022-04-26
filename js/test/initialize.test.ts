import * as mocha from 'mocha';
import * as chai from 'chai';
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
  Token,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
const BN = require("bn.js");

describe('Initialize', () => {

  let payee: PublicKey;

  it('initialize' , () => {



  });

});
