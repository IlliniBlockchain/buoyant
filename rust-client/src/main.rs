use solana_client::{rpc_client::RpcClient};
use solana_program::{
    pubkey::Pubkey,
};
use solana_sdk::{
    signature::{Keypair, Signature, Signer},
    transaction::Transaction,
};
use spl_token;

use std::env;
use std::error::Error;

pub mod initialize;
pub mod utils;

fn main() {
    // command line arguments
    let args: Vec<String> = env::args().collect();
    if args.len() == 1 {
        print_help();
        return;
    }
    let instr_name = &args[1];

    println!("Started.");

    // initialize RPC client/connection
    let rpc_client = RpcClient::new("https://api.devnet.solana.com");

    // initialize payer/signer
    let user = Keypair::new();
    println!("Requesting air drop...");
    if let Ok(_) = request_air_drop(&rpc_client, &user.pubkey(), 1000000000) {
        println!("Airdrop finished.");
    }

    // set example subscription data
    let payee = &Pubkey::new_unique();
    let amount: u64 = 20;
    let duration: i64 = 30;
    let deposit_mint = spl_token::native_mint::id();

    // create instruction
    let instruction;
    match instr_name.as_str() {
        "-h" => {
            print_help();
            return;
        }
        "initialize" => {
            instruction = initialize::initialize_new(
                &rpc_client,
                &user.pubkey(),
                &deposit_mint,
                payee,
                amount,
                duration,
            )
            .unwrap();
        }
        _ => {
            println!("Invalid argument(s).");
            print_help();
            return;
        }
    }

    // create tx
    let latest_blockhash = rpc_client.get_latest_blockhash().unwrap();
    let transaction = Transaction::new_signed_with_payer(
        &[instruction],
        Some(&user.pubkey()),
        &[&user],
        latest_blockhash,
    );

    // send tx
    println!("Sending tx...");
    if let Ok(txid) = rpc_client.send_and_confirm_transaction(&transaction) {
        println!("Tx confirmed:");
        println!("https://explorer.solana.com/tx/{}?cluster=devnet", txid);
    }

    println!("Finished.");
}

fn print_help() {
    println!(
        "Usage:
    cargo run [ACTION] [..ARGS]
Actions:
    initialize"
    );
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
