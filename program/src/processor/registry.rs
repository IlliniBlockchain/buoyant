use solana_program::{
    account_info::next_account_info,
    program_pack::Pack,
    program::{invoke, invoke_signed},
    account_info::AccountInfo, entrypoint::ProgramResult, msg, program_error::ProgramError,
    system_instruction, system_program,
    pubkey::Pubkey,
    sysvar::{rent, Sysvar},
};

use spl_token::*;

use crate::{
    utils::{check_program_id, check_writable, check_signer, check_pda},
    error::SubscriptionError,
    state::Subscription,
};

pub fn process_registry(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    count: u64,
) -> ProgramResult {
    //get acccounts
    let accounts_iter = &mut accounts.iter();

    let user_ai = next_account_info(accounts_iter)?;
    let registry_ai = next_account_info(accounts_iter)?;
    let subscription_ai = next_account_info(accounts_iter)?;

    //get programs needed
    let system_program_ai = next_account_info(accounts_iter)?;
    let sysvar_rent_ai = next_account_info(accounts_iter)?;

    //validate accounts
    check_signer(user_ai)?;
    check_writable(user_ai)?;
    check_writable(registry_ai)?;

    //validate program ID
    check_program_id(system_program_ai, &system_program::id())?;
    check_program_id(sysvar_rent_ai, &rent::id())?;

    //get current registry count
    let mut registry_data = registry_ai.try_borrow_mut_data()?;
    let registry_length = registry_ai.data_len();
    let mut registry_count: u64 = registry_length / 48;

    //check registry PDA
    let registry_seeds = &[
        b"subscription_registry",
        &registry_count.to_le_bytes(),
    ];

    check_pda(registry_ai, registry_seeds, program_id)?;

    //get subscription parameters
    if subscription_ai.data_len() == 0 {
        return Err(SubscriptionError::NoData.into());
    }
    let mut subscription = Subscription::try_from_slice(&subscription_ai.try_borrow_data()?)?;

    let payee = &subscription.payee;
    let amount = subscription.amount;
    let duration = subscription.duration;

    //convert all existing data to bytes
    let mut payee_data = payee.as_ref();
    let mut amount_data = &amount.to_le_bytes();
    let mut duration_data = &duration.to_le_bytes();

    //check subscription PDA
    let subscription_seeds = &[
        b"subscription_metadata",
        payee_data,
        amount_data,
        duration_data,
        &count.to_le_bytes(),
    ];

    check_pda(subscription_ai, subscription_seeds, program_id)?;

    //compress payee, amount, duration to one array
    let mut new_data: [u8, 48];

    for i in 0..32 {
        new_data[i] = payee_data[i];
    }

    for i in 32..(32+8) {
        new_data[i] = amount_data[i - 32];
    }

    for i in 40..(40+8) {
        new_data[i] = duration_data[i - 40];
    }

    //check if new subscription already exists in registry
    for i in 0..registry_count {
        let mut duplicate = true;
        for j in 0..48 {
            if new_data[j] != registry_data[i*48 + j] {
                duplicate = false;
            }
        }
        if duplicate {
            return Err(SubscriptionError::DuplicateReg.into());
        }
    }

    //find existing lamports and set to zero
    let existing_lamports = registry_ai.lamports();
    **registry_ai.lamports.borrow_mut() = 0;

    //increment registry count and change seeds
    registry_count += 1;
    let registry_seeds = &[
        b"subscription_registry",
        &registry_count.to_le_bytes(),
    ]

    //create new registry account with more space for data
    invoke_signed(
        let new_length = registry_length + 48;
        &system_instruction::create_account(
            user_ai.key, 
            registry_ai.key, 
            rent::Rent::get()?.minimum_balance(new_length - registry_length), 
            new_length as u64, 
            program_id,
        ), 
        &[
            user_ai.clone();
            registry_ai.clone();
            system_program_ai.clone();
        ], 
        &[registry_seeds],
    );

    //add the lamports from before adding this space
    let user_added_lamports = registry_ai.lamports();
    **registry_ai.lamports.borrow_mut() = user_added_lamports
        .checked_add(existing_lamports)
        .ok_or(TokenError::Overflow)?;
    
    //loop through and add data

    Ok(())
}