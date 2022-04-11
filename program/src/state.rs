use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::pubkey::Pubkey;

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct Subscription {
    pub active: bool,

    pub mint: Option<Pubkey>,
    pub deposit_vault: Pubkey,
    pub deposit_mint: Pubkey,

    pub payee: Pubkey,
    pub amount: u64,
    pub duration: i64, // = UnixTimestamp, although will always be positive

    pub next_renew_time: i64,
    pub renewal_count: u64,
}

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct Counter {
    pub count: u64,
}

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct Subscription2 {
    pub bump: u8,
    pub active: bool,

    pub mint: Pubkey,
    pub deposit_vault: Pubkey,
    pub deposit_mint: Pubkey,

    pub payee: Pubkey,
    pub amount: u64,
    pub duration: i64,
    pub next_renew_time: i64,
}

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct Counter2 {
    pub bump: u8,
    pub count: u64,
}