use solana_client::rpc_client::RpcClient;
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

fn main() {
    println!("Started.");
    let rpc_client = RpcClient::new("https://api.devnet.solana.com");

    let program_id = match Pubkey::from_str("Fpwgc9Tq7k2nMzVxYqPWwKGA7FbCQwo2BgekpT69Cgbf") {
        Ok(pubkey) => pubkey,
        Err(_) => panic!(),
    };

    let user = Keypair::new();
    if let Ok(airdrop_sig) = request_air_drop(&rpc_client, &user.pubkey(), 1.0) {
        println!("Airdrop finished.");
    }
    let payee = &Keypair::new().pubkey();
    let amount: u64 = 20;
    let duration: i64 = 30;

    let counter_seeds = &[
        b"subscription_counter",
        payee.as_ref(),
        &amount.to_le_bytes(),
        &duration.to_le_bytes(),
    ];
    let (counter, _) = Pubkey::find_program_address(counter_seeds, &program_id);

    // Find uninitialized subscription PDA
    let count: u64 = 0;
    let subscription_seeds = &[
        b"subscription_metadata",
        payee.as_ref(),
        &amount.to_le_bytes(),
        &duration.to_le_bytes(),
        &count.to_le_bytes(),
    ];
    let (sub, _) = Pubkey::find_program_address(subscription_seeds, &program_id);

    let mint = spl_token::native_mint::id(); // SPL token address
    let vault = spl_associated_token_account::get_associated_token_address(&sub, &mint);

    let instruction = initialize(
        &program_id,
        &user.pubkey(),
        &counter,
        &sub,
        &vault,
        &mint,
        payee,
        amount,
        duration,
    )
    .unwrap();

    let blockhash = rpc_client.get_latest_blockhash().unwrap();

    // let transaction = Transaction::new_signed_with_payer(
    //     &[instruction],
    //     Some(&user.pubkey()),
    //     &[user],
    //     blockhash,
    // );
    let mut transaction = Transaction::new_with_payer(&[instruction], Some(&user.pubkey()));
    transaction.sign(&[&user], blockhash);
    if let Ok(txid) = rpc_client.send_and_confirm_transaction(&transaction) {
        println!("Tx finished: {:?}", txid);
    }

    println!("Finished.");
}

pub fn initialize(
    program_pubkey: &Pubkey,
    user_pubkey: &Pubkey,
    counter_pubkey: &Pubkey,
    subscription_pubkey: &Pubkey,
    vault_pubkey: &Pubkey,
    vault_mint_pubkey: &Pubkey,
    payee: &Pubkey,
    amount: u64,
    duration: i64,
) -> Result<Instruction, ProgramError> {
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

    Ok(Instruction {
        program_id: *program_pubkey,
        accounts,
        data: data,
    })
}

const LAMPORTS_PER_SOL: f64 = 1000000000.0;

pub fn create_keypair() -> Keypair {
    Keypair::new()
}

pub fn check_balance(rpc_client: &RpcClient, public_key: &Pubkey) -> Result<f64, Box<dyn Error>> {
    Ok(rpc_client.get_balance(&public_key)? as f64 / LAMPORTS_PER_SOL)
}

pub fn request_air_drop(
    rpc_client: &RpcClient,
    pub_key: &Pubkey,
    amount_sol: f64,
) -> Result<Signature, Box<dyn Error>> {
    let sig = rpc_client.request_airdrop(&pub_key, (amount_sol * LAMPORTS_PER_SOL) as u64)?;
    loop {
        let confirmed = rpc_client.confirm_transaction(&sig)?;
        if confirmed {
            break;
        }
    }
    Ok(sig)
}

pub fn transfer_funds(
    rpc_client: &RpcClient,
    sender_keypair: &Keypair,
    receiver_pub_key: &Pubkey,
    amount_sol: f64,
) -> core::result::Result<Signature, Box<dyn Error>> {
    let amount_lamports = (amount_sol * LAMPORTS_PER_SOL) as u64;

    Ok(
        rpc_client.send_and_confirm_transaction(&system_transaction::transfer(
            &sender_keypair,
            &receiver_pub_key,
            amount_lamports,
            rpc_client.get_latest_blockhash()?,
        ))?,
    )
}
