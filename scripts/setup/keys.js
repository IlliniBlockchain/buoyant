const {
  Keypair, PublicKey,
} = require("@solana/web3.js");

const mintAuthority = Keypair.fromSecretKey(
  Uint8Array.from([
    44, 152,  71, 225, 202,  62, 208,  47,  99, 134, 230,
   216, 213, 131, 173, 213, 212,  88,  90, 155,  56,  58,
    19, 239, 123, 109, 247,  86, 204,  24, 144,  41, 125,
   186, 203, 180, 161, 170,  86, 140,  91,  88, 166, 154,
   109,  45, 126,  83, 127,  68, 221, 128, 232,  89, 172,
   151,  48,  20,  46, 138, 147, 122, 230,  97
 ])
);

const user = Keypair.fromSecretKey(
  Uint8Array.from([
    223,  52, 148,  85,  28, 155, 106,  92,   3,  46, 191,
     36,  31, 102, 121, 244,  67, 157,  21, 194,   8, 143,
     89, 172, 121, 103, 130,  92, 140, 151, 101,  13, 199,
    156, 243, 214, 180, 153, 125,  75, 246, 191, 194,  14,
     48, 220, 100,  94,  67,  68, 134,  91, 108, 117, 213,
     40, 205,  29, 230, 207, 220, 238, 187, 103
  ])
);

const mintKey = new PublicKey("Cj1wxenWnRGb7LwRb1zdDiJStTNrJWtipoA2nHtTrsim");
const userTokenAccount = new PublicKey("9JnJ3o9FCus4vRTuxg5bvM2kR1sL5vBPYvzRNL2JwZ21");

module.exports = { mintAuthority, user, mintKey, userTokenAccount };