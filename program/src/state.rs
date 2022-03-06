use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    clock::{Clock, UnixTimestamp},
    pubkey::Pubkey,
};
use std::mem::size_of;

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct Subscription {
    mint: Option<Pubkey>,
    payee: Pubkey,
    deposit_vault: Pubkey,
    deposit_mint: Pubkey,
    amount: u64,
    duration: UnixTimestamp, // = i64, although will always be positive
    next_renew_time: UnixTimestamp,
}
