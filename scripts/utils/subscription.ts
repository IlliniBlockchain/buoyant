const borsh = require('borsh')

/**
 * Subscription class for deserializing account data
 */
export class Subscription {
  static schema = new Map([
    [
      Subscription,
      {
        kind: "struct",
        fields: [
          ["active", "u8"],
          ["initialized", "u8"],
          ["mint", [32]],
          ["depositVault", [32]],
          ["depositMint", [32]],
          ["payee", [32]],
          ["amount", "u64"],
          ["duration", "u64"],
          ["nextRenewTime", "u64"],
          ["renewalCount", "u64"],
        ],
      },
    ],
  ]);

  constructor(data: Buffer) {
    const newValue = borsh.deserialize(Subscription.schema, Subscription, data);
    console.log(newValue);
  }
}
