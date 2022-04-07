#![cfg(feature = "test-bpf")]

mod instruction;

use {
    solana_sdk::{signature::{Signer, Keypair}, transaction::Transaction},
    solana_program_test::*,
    assert_matches::*,
    solana_program::{
        system_program,
        sysvar::{rent::Rent, Sysvar},
        instruction::{AccountMeta, Instruction},
        pubkey::Pubkey,
        system_instruction,
    },
    solana_validator::test_validator::*,
    spl_token::native_mint,
    spl_associated_token_account
};

#[test]
fn test_init() {
    solana_logger::setup_with_default("solana_program_runtime=debug");
    let program_pubkey = Pubkey::new_unique();

    // Params
    let payee = Keypair::new();
    let amount: u64 = 1;
    let duration: i64 = 10;
    let payee_pubkey = payee.pubkey();

    let (test_validator, user) = TestValidatorGenesis::default()
        .add_program("initialize", program_id)
        .start();
    let rpc_client = test_validator.get_rpc_client();

    let recent_blockhash = rpc_client.get_latest_blockhash().unwrap();

    // Find uninitialized counter PDA
    let counter_seeds = &[
        b"subscription_counter",
        payee_pubkey.as_ref(),
        &amount.to_le_bytes(),
        &duration.to_le_bytes(),
    ];
    let (counter, _) = Pubkey::find_program_address(counter_seeds, &program_pubkey);

    // Find uninitialized subscription PDA
    let count: u64 = 0;
    let subscription_seeds = &[
        b"subscription_metadata",
        payee_pubkey.as_ref(),
        &amount.to_le_bytes(),
        &duration.to_le_bytes(),
        &count.to_le_bytes(),
    ];
    let (sub, _) = Pubkey::find_program_address(subscription_seeds, &program_pubkey);

    // Create vault
    let mint = native_mint::id();
    let vault = get_associated_token_address(&sub, &mint);

    // Send txn
    let blockhash = connection.get_latest_blockhash().unwrap();
    let mut transaction = Transaction::new_with_payer(
        &[instruction::initialize(
            &program_pubkey,
            &user.pubkey(),
            &counter,
            &sub,
            &vault,
            &mint,
            &payee.pubkey(),
            amount,
            duration
        ).unwrap()],
        Some(&user.pubkey()),
    );
    transaction.sign(&[&user], blockhash);

    assert_matches!(rpc_client.send_and_confirm_transaction(&transaction), Ok(_));
}