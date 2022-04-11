#![cfg(feature = "test-bpf")]

use std::str::FromStr;
use solana_client::{client_error::ClientError, rpc_client::RpcClient};
mod utils;
mod instruction;
// use buoyant::utils::{get_subscription_count};
// use buoyant::instruction::initialize;
use solana_program::{
    instruction::{AccountMeta, Instruction},
    program_error::ProgramError,
    pubkey::Pubkey,
};
use solana_sdk::{
    signature::{Keypair, Signature, Signer},
    signers::Signers,
    system_transaction,
    transaction::Transaction,
};
use spl_token;

use std::env;
use std::error::Error;

pub fn initialize_new(
    rpc_client: &RpcClient,
    user_pubkey: &Pubkey,
    deposit_mint: &Pubkey,
    payee: &Pubkey,
    amount: u64,
    duration: i64,
) -> Result<Instruction, ClientError> {
    let count = utils::get_subscription_count(rpc_client, payee, amount, duration)?;
    let instruction = instruction::initialize(user_pubkey, deposit_mint, payee, amount, duration, count);
    Ok(instruction)
}


// CLIENT UTILS


pub fn get_subscription_count(
    rpc_client: &RpcClient,
    payee: &Pubkey,
    amount: u64,
    duration: i64,
) -> Result<u64, ClientError> {
    let (counter, _) = utils::get_counter_address(payee, amount, duration);
    let count: u64 = match rpc_client.get_account_data(&counter) {
        Ok(data) => u64::from_le_bytes(data.try_into().unwrap()),
        Err(_) => 0,
    };

    Ok(count)
}