
const { Subscription } = require("./dist/subscription");

const {
  Keypair, PublicKey,
} = require("@solana/web3.js");

const payee = new Keypair();
console.log(payee.publicKey.toBase58());

const sub = new Subscription(Buffer.from([]));