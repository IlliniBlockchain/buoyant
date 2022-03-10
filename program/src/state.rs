use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    clock::{Clock, UnixTimestamp},
    pubkey::Pubkey,
};
use std::mem::size_of;

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct Subscription {
    pub mint: Option<Pubkey>,
    pub payee: Pubkey,
    pub deposit_vault: Pubkey,
    pub deposit_mint: Pubkey,
    pub amount: u64,
    pub duration: UnixTimestamp, // = i64, although will always be positive
    pub next_renew_time: UnixTimestamp,
}

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct Counter {
    pub count: u64
}