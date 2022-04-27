import { struct } from "@solana/buffer-layout";
import { bool, publicKey, u64 } from "@solana/buffer-layout-utils";
import { Commitment, Connection, PublicKey } from "@solana/web3.js";
import { BUOYANT_PROGRAM_ID } from "../constants";

export interface Subscription {
  active: boolean;
  mint: PublicKey | null;
  depositVault: PublicKey;
  depositMint: PublicKey;
  payee: PublicKey;
  amount: bigint;
  duration: bigint;
  nextRenewTime: bigint;
  renewalCount: bigint;
}

export interface RawSubscriptionNew {
  active: boolean;
  mintOption: 1 | 0;
  depositVault: PublicKey;
  depositMint: PublicKey;
  payee: PublicKey;
  amount: bigint;
  duration: bigint;
  nextRenewTime: bigint;
  renewalCount: bigint;
}

export const SubscriptionNewLayout = struct<RawSubscriptionNew>([
  bool("active"),
  bool("mintOption"),
  publicKey("depositVault"),
  publicKey("depositMint"),
  publicKey("payee"),
  u64("amount"),
  u64("duration"),
  u64("nextRenewTime"),
  u64("renewalCount"),
]);

export interface RawSubscription {
  active: boolean;
  mintOption: 1 | 0;
  mint: PublicKey | null;
  depositVault: PublicKey;
  depositMint: PublicKey;
  payee: PublicKey;
  amount: bigint;
  duration: bigint;
  nextRenewTime: bigint;
  renewalCount: bigint;
}

export const SubscriptionLayout = struct<RawSubscription>([
  bool("active"),
  bool("mintOption"),
  publicKey("mint"),
  publicKey("depositVault"),
  publicKey("depositMint"),
  publicKey("payee"),
  u64("amount"),
  u64("duration"),
  u64("nextRenewTime"),
  u64("renewalCount"),
]);

export const SUBSCRIPTION_SIZE = SubscriptionLayout.span;

export const getSubscription = async (
  connection: Connection,
  address: PublicKey,
  commitment?: Commitment,
  programId = BUOYANT_PROGRAM_ID
): Promise<Subscription> => {
  const accountInfo = await connection.getAccountInfo(address, commitment);
  if (!accountInfo) throw new Error("Subscription account not found.");
  if (!accountInfo.owner.equals(programId))
    throw new Error("Subscription account not owned by program.");

  if (accountInfo.data.length === 0)
    throw new Error("Subscription account uninitialized.");

  let active: boolean;
  let mint: PublicKey | null;
  let depositVault: PublicKey;
  let depositMint: PublicKey;
  let payee: PublicKey;
  let amount: bigint;
  let duration: bigint;
  let nextRenewTime: bigint;
  let renewalCount: bigint;
  if (accountInfo.data[1] === 0) {
    const rawSubscriptionNew = SubscriptionNewLayout.decode(
      accountInfo.data.slice(0, SUBSCRIPTION_SIZE - 32)
    );
    active = rawSubscriptionNew.active;
    mint = null;
    depositVault = rawSubscriptionNew.depositVault;
    depositMint = rawSubscriptionNew.depositMint;
    payee = rawSubscriptionNew.payee;
    amount = rawSubscriptionNew.amount;
    duration = rawSubscriptionNew.duration;
    nextRenewTime = rawSubscriptionNew.nextRenewTime;
    renewalCount = rawSubscriptionNew.renewalCount;
  } else if (accountInfo.data.length === SUBSCRIPTION_SIZE) {
    const rawSubscription = SubscriptionLayout.decode(
      accountInfo.data.slice(0, SUBSCRIPTION_SIZE)
    );
    active = rawSubscription.active;
    mint = rawSubscription.mint;
    depositVault = rawSubscription.depositVault;
    depositMint = rawSubscription.depositMint;
    payee = rawSubscription.payee;
    amount = rawSubscription.amount;
    duration = rawSubscription.duration;
    nextRenewTime = rawSubscription.nextRenewTime;
    renewalCount = rawSubscription.renewalCount;
  }

  return {
    active,
    mint,
    depositVault,
    depositMint,
    payee,
    amount,
    duration,
    nextRenewTime,
    renewalCount,
  };
};
