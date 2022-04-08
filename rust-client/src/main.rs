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

fn program_id() -> Pubkey {
    Pubkey::from_str("Fpwgc9Tq7k2nMzVxYqPWwKGA7FbCQwo2BgekpT69Cgbf").unwrap()
}

fn main() {
    println!("Started.");
    let rpc_client = RpcClient::new("https://api.devnet.solana.com");

    let user = Keypair::new();
    println!("Requesting air drop...");
    if let Ok(_) = request_air_drop(&rpc_client, &user.pubkey(), 1000000000) {
        println!("Airdrop finished.");
    }

    let payee = &Pubkey::new_unique();
    let amount: u64 = 20;
    let duration: i64 = 30;
    let deposit_mint = spl_token::native_mint::id();

    let instruction = initialize_new(
        &rpc_client,
        &user.pubkey(),
        &deposit_mint,
        payee,
        amount,
        duration,
    )
    .unwrap();

    let latest_blockhash = rpc_client.get_latest_blockhash().unwrap();

    let transaction = Transaction::new_signed_with_payer(
        &[instruction],
        Some(&user.pubkey()),
        &[&user],
        latest_blockhash,
    );

    println!("Sending tx...");
    if let Ok(txid) = rpc_client.send_and_confirm_transaction(&transaction) {
        println!("Tx confirmed:");
        println!("https://explorer.solana.com/tx/{}?cluster=devnet", txid);
    }

    println!("Finished.");
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

    initialize_raw(
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

pub fn initialize_raw(
    user_pubkey: &Pubkey,
    counter_pubkey: &Pubkey,
    subscription_pubkey: &Pubkey,
    vault_pubkey: &Pubkey,
    vault_mint_pubkey: &Pubkey,
    payee: &Pubkey,
    amount: u64,
    duration: i64,
) -> Instruction {
    let mut data = vec![0];
    data.append(&mut payee.as_ref().to_vec());
    data.append(&mut amount.to_le_bytes().to_vec());
    data.append(&mut duration.to_le_bytes().to_vec());

    let accounts = vec![
        AccountMeta::new(*user_pubkey, true),
        AccountMeta::new(*counter_pubkey, false),
        AccountMeta::new(*subscription_pubkey, false),
        AccountMeta::new(*vault_pubkey, false),
        AccountMeta::new_readonly(*vault_mint_pubkey, false),
        AccountMeta::new_readonly(system_program::id(), false),
        AccountMeta::new_readonly(rent::id(), false),
        AccountMeta::new_readonly(spl_token::id(), false),
        AccountMeta::new_readonly(spl_associated_token_account::id(), false),
    ];

    Instruction {
        program_id: program_id(),
        accounts,
        data,
    }
}

pub fn request_air_drop(
    rpc_client: &RpcClient,
    destination: &Pubkey,
    amount: u64,
) -> Result<Signature, Box<dyn Error>> {
    let sig = rpc_client.request_airdrop(&destination, amount)?;
    loop {
        let confirmed = rpc_client.confirm_transaction(&sig)?;
        if confirmed {
            break;
        }
    }
    Ok(sig)
}
