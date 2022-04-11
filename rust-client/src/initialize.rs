
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
use crate::utils::*;
use buoyant::instruction;


pub fn initialize_new(
    rpc_client: &RpcClient,
    user_pubkey: &Pubkey,
    deposit_mint: &Pubkey,
    payee: &Pubkey,
    amount: u64,
    duration: i64,
) -> Result<Instruction, ClientError> {
    let count = get_subscription_count(rpc_client, payee, amount, duration)?;
    let instruction = initialize(user_pubkey, deposit_mint, payee, amount, duration, count);
    Ok(instruction)
}

pub fn initialize(
    user_pubkey: &Pubkey,
    deposit_mint: &Pubkey,
    payee: &Pubkey,
    amount: u64,
    duration: i64,
    count: u64,
) -> Instruction {
    let (counter, _) = get_counter_address(payee, amount, duration);
    let (subscription, _) = get_subscription_address(payee, amount, duration, count);
    let deposit_vault =
        spl_associated_token_account::get_associated_token_address(&subscription, &deposit_mint);

    instruction::initialize(
        &program_id(),
        user_pubkey,
        &counter,
        &subscription,
        &deposit_vault,
        deposit_mint,
        payee,
        amount,
        duration,
    )
}