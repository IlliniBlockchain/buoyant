const { Keypair, Connection, PublicKey } = require("@solana/web3.js");
const { Token } = require("@solana/spl-token");

async function findTokenHolder(mintKey) {

  const connection = new Connection("https://api.devnet.solana.com/");

  const largestAccounts = (await connection.getTokenLargestAccounts(mintKey))
    .value;
  const accountInfo = await connection.getParsedAccountInfo(
    largestAccounts[0].address
  );
  return new PublicKey(accountInfo.value.data.parsed.info.owner);

}

module.exports = { findTokenHolder };
