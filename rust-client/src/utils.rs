
use solana_client::{client_error::ClientError, rpc_client::RpcClient};
use solana_program::{
    instruction::{AccountMeta, Instruction},
    program_error::ProgramError,
    pubkey::Pubkey,
    system_program,
    sysvar::{rent, Sysvar},
};
use solana_sdk::{
    signature::{Keypair, Signature, Signer},
    signers::Signers,
    system_transaction,
    transaction::Transaction,
};
use spl_associated_token_account;
use spl_token;
use std::error::Error;
use std::str::FromStr;

pub fn program_id() -> Pubkey {
    Pubkey::from_str("Fpwgc9Tq7k2nMzVxYqPWwKGA7FbCQwo2BgekpT69Cgbf").unwrap()
}

pub fn get_counter_address(payee: &Pubkey, amount: u64, duration: i64) -> (Pubkey, u8) {
    let counter_seeds = &[
        b"subscription_counter",
        payee.as_ref(),
        &amount.to_le_bytes(),
        &duration.to_le_bytes(),
    ];
    Pubkey::find_program_address(counter_seeds, &program_id())
}

pub fn get_subscription_address(
    payee: &Pubkey,
    amount: u64,
    duration: i64,
    count: u64,
) -> (Pubkey, u8) {
    let subscription_seeds = &[
        b"subscription_metadata",
        payee.as_ref(),
        &amount.to_le_bytes(),
        &duration.to_le_bytes(),
        &count.to_le_bytes(),
    ];
    Pubkey::find_program_address(subscription_seeds, &program_id())
}


pub fn get_subscription_count(
    rpc_client: &RpcClient,
    payee: &Pubkey,
    amount: u64,
    duration: i64,
) -> Result<u64, ClientError> {
    let (counter, _) = get_counter_address(payee, amount, duration);
    let count: u64 = match rpc_client.get_account_data(&counter) {
        Ok(data) => u64::from_le_bytes(data.try_into().unwrap()),
        Err(_) => 0,
    };

    Ok(count)
}