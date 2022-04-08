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

pub mod initialize;
pub mod utils;

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

    let instruction = initialize::initialize_new(
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
