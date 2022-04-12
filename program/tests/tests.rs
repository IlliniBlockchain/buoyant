#![cfg(feature = "test-bpf")]

use {
    solana_sdk::{signature::{Signer, Keypair}, transaction::Transaction},
    assert_matches::*,
    solana_program::pubkey::Pubkey,
    solana_validator::test_validator::*,
    spl_token::native_mint,
    spl_associated_token_account::get_associated_token_address,
    buoyant::{instruction, state},
    borsh::BorshDeserialize
};

#[test]
fn test_initialize() {
    solana_logger::setup_with_default("solana_program_runtime=debug");
    let program_pubkey = Pubkey::new_unique();

    // Params
    let payee = Keypair::new();
    let amount: u64 = 1; // 1 lamport deposited into vault
    let duration: i64 = 10; // subscription recurrs every 10 seconds
    let payee_pubkey = payee.pubkey();

    // Configure test validator
    let (test_validator, user) = TestValidatorGenesis::default()
        .add_program("buoyant", program_pubkey)
        .start();
    let rpc_client = test_validator.get_rpc_client();

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

    // Find vault (ATA of subscription PDA for a given token) 
    let mint = native_mint::id(); // SPL token address
    let vault = get_associated_token_address(&sub, &mint);

    // Send and confirm txn
    let blockhash = rpc_client.get_latest_blockhash().unwrap();
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
        )],
        Some(&user.pubkey()),
    );
    transaction.sign(&[&user], blockhash);

    assert_matches!(rpc_client.send_and_confirm_transaction(&transaction), Ok(_));
}

#[test]
fn test_initialize2() {
    solana_logger::setup_with_default("solana_program_runtime=debug");
    let program_id = Pubkey::new_unique();

    // Params
    let payee = Pubkey::new_unique();
    let amount: u64 = 200; // 200 [token] deposited into vault
    let duration: i64 = 10; // subscription recurrs every 10 seconds
    let start_amount: u64 = 201;

    // Configure test validator
    let (test_validator, user) = TestValidatorGenesis::default()
        .add_program("buoyant", program_id)
        .start();
    let rpc_client = test_validator.get_rpc_client();

    // Find uninitialized counter PDA
    let counter_seeds = &[
        b"subscription_counter",
        payee.as_ref(),
        &amount.to_le_bytes(),
        &duration.to_le_bytes(),
    ];
    let (subscription_counter, _) = Pubkey::find_program_address(counter_seeds, &program_id);

    // Find uninitialized subscription PDA
    let count: u64 = 0;
    let subscription_seeds = &[
        b"subscription_metadata",
        payee.as_ref(),
        &amount.to_le_bytes(),
        &duration.to_le_bytes(),
        &count.to_le_bytes(),
    ];
    let (subscription, _) = Pubkey::find_program_address(subscription_seeds, &program_id);

    let subscription_mint_seeds = &[
        b"subscription_mint",
        subscription.as_ref(),
    ];
    let (subscription_mint, _) = Pubkey::find_program_address(subscription_mint_seeds, &program_id);

    // Find vault (ATA of subscription PDA for a given token) 
    let deposit_mint = native_mint::id(); // SPL token address
    let deposit_vault = get_associated_token_address(&subscription, &deposit_mint);
    let payee_deposit_account = get_associated_token_address(&payee, &deposit_mint);
    let user_deposit_account = get_associated_token_address(&user.pubkey(), &deposit_mint);
    let user_subscription_token_account = get_associated_token_address(&user.pubkey(), &subscription_mint);

    // Send and confirm txn
    let blockhash = rpc_client.get_latest_blockhash().unwrap();
    let mut transaction = Transaction::new_with_payer(
        &[instruction::initialize2(
            &program_id,
            &user.pubkey(),
            &user_deposit_account,
            &user_subscription_token_account,
            &payee,
            &payee_deposit_account,
            &subscription,
            &subscription_counter,
            &subscription_mint,
            &deposit_vault,
            &deposit_mint,
            amount,
            duration,
            start_amount,
        )],
        Some(&user.pubkey()),
    );
    transaction.sign(&[&user], blockhash);

    assert_matches!(rpc_client.send_and_confirm_transaction(&transaction), Ok(_));

    // check account info for proper outputs
    let subscription_bytes = rpc_client.get_account_data(&subscription).unwrap();
    let subscription_data = state::Subscription2::try_from_slice(&subscription_bytes[..]).unwrap();
    assert_eq!(subscription_data.active, true);

}

#[test]
fn test_renew2() {
    solana_logger::setup_with_default("solana_program_runtime=debug");
    let program_id = Pubkey::new_unique();

    // Params
    let payee = Pubkey::new_unique();
    let amount: u64 = 200; // 200 [token] deposited into vault
    let duration: i64 = 1; // subscription recurrs every 1 seconds
    let start_amount: u64 = 201;

    // Configure test validator
    let (test_validator, user) = TestValidatorGenesis::default()
        .add_program("buoyant", program_id)
        .start();
    let rpc_client = test_validator.get_rpc_client();

    // Find uninitialized counter PDA
    let counter_seeds = &[
        b"subscription_counter",
        payee.as_ref(),
        &amount.to_le_bytes(),
        &duration.to_le_bytes(),
    ];
    let (subscription_counter, _) = Pubkey::find_program_address(counter_seeds, &program_id);

    // Find uninitialized subscription PDA
    let count: u64 = 0;
    let subscription_seeds = &[
        b"subscription_metadata",
        payee.as_ref(),
        &amount.to_le_bytes(),
        &duration.to_le_bytes(),
        &count.to_le_bytes(),
    ];
    let (subscription, _) = Pubkey::find_program_address(subscription_seeds, &program_id);

    let subscription_mint_seeds = &[
        b"subscription_mint",
        subscription.as_ref(),
    ];
    let (subscription_mint, _) = Pubkey::find_program_address(subscription_mint_seeds, &program_id);

    // Find vault (ATA of subscription PDA for a given token) 
    let deposit_mint = native_mint::id(); // SPL token address
    let deposit_vault = get_associated_token_address(&subscription, &deposit_mint);
    let payee_deposit_account = get_associated_token_address(&payee, &deposit_mint);
    let user_deposit_account = get_associated_token_address(&user.pubkey(), &deposit_mint);
    let user_subscription_token_account = get_associated_token_address(&user.pubkey(), &subscription_mint);

    // Send and confirm txn
    let blockhash = rpc_client.get_latest_blockhash().unwrap();
    let mut transaction = Transaction::new_with_payer(
        &[instruction::initialize2(
            &program_id,
            &user.pubkey(),
            &user_deposit_account,
            &user_subscription_token_account,
            &payee,
            &payee_deposit_account,
            &subscription,
            &subscription_counter,
            &subscription_mint,
            &deposit_vault,
            &deposit_mint,
            amount,
            duration,
            start_amount,
        )],
        Some(&user.pubkey()),
    );
    transaction.sign(&[&user], blockhash);
    assert_matches!(rpc_client.send_and_confirm_transaction(&transaction), Ok(_));
    println!("Successfully called initialize2 instruction.");

    let blockhash = rpc_client.get_latest_blockhash().unwrap();
    let mut transaction = Transaction::new_with_payer(
        &[instruction::renew2(
            &program_id,
            &user.pubkey(),
            &user_deposit_account,
            &payee,
            &payee_deposit_account,
            &subscription,
            &deposit_vault,
            &deposit_mint,
        )],
        Some(&user.pubkey()),
    );
    transaction.sign(&[&user], blockhash);
    assert_matches!(rpc_client.send_and_confirm_transaction(&transaction), Ok(_));
    println!("Successfully called renew2 instruction.");

    // check account info for proper outputs
    let subscription_bytes = rpc_client.get_account_data(&subscription).unwrap();
    let subscription_data = state::Subscription2::try_from_slice(&subscription_bytes[..]).unwrap();
    assert_eq!(subscription_data.active, false);
    
}