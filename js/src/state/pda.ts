import { Connection, PublicKey } from "@solana/web3.js";
import { BN } from "bn.js";
import { BUOYANT_PROGRAM_ID } from "../constants";

export const getSubscriptionCounterAddress = async (
  payee: PublicKey,
  amount: number,
  duration: number
): Promise<PublicKey> => {
  const [subscriptionCounterAddress, subscriptionCounterBump] =
    await PublicKey.findProgramAddress(
      [
        Buffer.from("subscription_counter"),
        payee.toBuffer(),
        Buffer.from(new Uint8Array(new BN(amount).toArray("le", 8))),
        Buffer.from(new Uint8Array(new BN(duration).toArray("le", 8))),
      ],
      BUOYANT_PROGRAM_ID
    );
  return subscriptionCounterAddress;
};

export const getSubscriptionAddress = async (
  payee: PublicKey,
  amount: number,
  duration: number,
  count: number
): Promise<PublicKey> => {
  const [subscriptionKey, subscriptionBump] =
    await PublicKey.findProgramAddress(
      [
        Buffer.from("subscription_metadata"),
        payee.toBuffer(),
        Buffer.from(new Uint8Array(new BN(amount).toArray("le", 8))),
        Buffer.from(new Uint8Array(new BN(duration).toArray("le", 8))),
        Buffer.from(new Uint8Array(new BN(count).toArray("le", 8))),
      ],
      BUOYANT_PROGRAM_ID
    );
  return subscriptionKey;
};

export const getSubscriptionCount = async (
  connection: Connection,
  payee: PublicKey,
  amount: number,
  duration: number
): Promise<number> => {
  const subscriptionCounterAddress = await getSubscriptionCounterAddress(
    payee,
    amount,
    duration
  );
  const accountInfo = await connection.getAccountInfo(
    subscriptionCounterAddress
  );
  const count =
    accountInfo == null || accountInfo.data.length == 0
      ? new BN(0)
      : new BN(accountInfo.data, "le");
  return count.toNumber();
};

export const getNewSubscriptionAddress = async (
  connection: Connection,
  payee: PublicKey,
  amount: number,
  duration: number
): Promise<PublicKey> => {
  const subscriptionCount = await getSubscriptionCount(
    connection,
    payee,
    amount,
    duration
  );
  const newSubscriptionAddress = await getSubscriptionAddress(
    payee,
    amount,
    duration,
    subscriptionCount
  );
  return newSubscriptionAddress;
};
