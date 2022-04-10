use {
    crate::{
        state::{Counter, Subscription},
        utils::{
            check_ata, check_pda, check_pda_with_bump, check_program_id, check_signer,
            check_writable,
        },
    },
    borsh::{BorshDeserialize, BorshSerialize},
    solana_program::{
        account_info::{next_account_info, AccountInfo},
        entrypoint::ProgramResult,
        program::{invoke, invoke_signed},
        pubkey::Pubkey,
        system_instruction, system_program,
        sysvar::{rent, Sysvar},
    },
};

pub fn process_initialize(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    payee: &Pubkey,
    amount: u64,
    duration: i64,
) -> ProgramResult {
    // GET ACCOUNTS
    let accounts_iter = &mut accounts.iter();

    // accounts
    let user_ai = next_account_info(accounts_iter)?;
    let counter_ai = next_account_info(accounts_iter)?;
    let subscription_ai = next_account_info(accounts_iter)?;
    let deposit_vault_ai = next_account_info(accounts_iter)?;
    let deposit_mint_ai = next_account_info(accounts_iter)?;

    // programs
    let system_program_ai = next_account_info(accounts_iter)?;
    let sysvar_rent_ai = next_account_info(accounts_iter)?;
    let token_program_ai = next_account_info(accounts_iter)?;
    let associated_token_program_ai = next_account_info(accounts_iter)?;

    // VALIDATE ACCOUNTS

    // account privileges
    check_signer(user_ai)?;
    check_writable(user_ai)?;
    check_writable(counter_ai)?;
    check_writable(subscription_ai)?;
    check_writable(deposit_vault_ai)?;

    // PDAs
    
    // check counter PDA
    // check if this is the first subscription of its type
    let (count, counter_bump) = if counter_ai.data_len() == 0 {
        let count = 0;

        // validate PDA without bump
        let counter_seeds = &[
            b"subscription_counter",
            payee.as_ref(),
            &amount.to_le_bytes(),
            &duration.to_le_bytes(),
        ];
        check_pda(counter_ai, counter_seeds, program_id)?;
        let (_, bump) = Pubkey::find_program_address(counter_seeds, program_id);

        (count, bump)
    } else {
        let counter_data = Counter::try_from_slice(&counter_ai.try_borrow_data()?)?;
        let count = counter_data.count;
        let bump = counter_data.bump;

        // validate PDA with bump
        let counter_seeds = &[
            b"subscription_counter",
            payee.as_ref(),
            &amount.to_le_bytes(),
            &duration.to_le_bytes(),
            &[bump],
        ];
        check_pda_with_bump(counter_ai, counter_seeds, program_id)?;

        (count, bump)
    };
    // set counter_seeds for possible initialization later on
    let counter_seeds = &[
        b"subscription_counter",
        payee.as_ref(),
        &amount.to_le_bytes(),
        &duration.to_le_bytes(),
        &[counter_bump],
    ];

    // check subscription PDA
    let subscription_seeds = &[
        b"subscription_metadata",
        payee.as_ref(),
        &amount.to_le_bytes(),
        &duration.to_le_bytes(),
        &count.to_le_bytes(),
    ];
    check_pda(subscription_ai, subscription_seeds, program_id)?;
    let (_, subscription_bump) = Pubkey::find_program_address(subscription_seeds, program_id);
    let subscription_seeds = &[
        b"subscription_metadata",
        payee.as_ref(),
        &amount.to_le_bytes(),
        &duration.to_le_bytes(),
        &count.to_le_bytes(),
        &[subscription_bump],
    ];

    // token accounts
    check_ata(deposit_vault_ai, subscription_ai.key, deposit_mint_ai.key)?;

    // programs
    check_program_id(system_program_ai, &system_program::id())?;
    check_program_id(sysvar_rent_ai, &rent::id())?;
    check_program_id(token_program_ai, &spl_token::id())?;
    check_program_id(
        associated_token_program_ai,
        &spl_associated_token_account::id(),
    )?;

    // logic

    // initialize deposity vault
    invoke(
        &spl_associated_token_account::create_associated_token_account(
            user_ai.key,
            subscription_ai.key,
            deposit_mint_ai.key,
        ),
        &[
            user_ai.clone(),
            deposit_vault_ai.clone(),
            subscription_ai.clone(),
            deposit_mint_ai.clone(),
            system_program_ai.clone(),
            token_program_ai.clone(),
            sysvar_rent_ai.clone(),
            associated_token_program_ai.clone(),
        ],
    )?;

    // initialize subscription metadata account
    let subscription_size = 1 + 1 + 32 + 32 + 32 + 32 + 8 + 8 + 8 + 8; // 162
    invoke_signed(
        &system_instruction::create_account(
            user_ai.key,
            subscription_ai.key,
            rent::Rent::get()?.minimum_balance(subscription_size),
            subscription_size as u64,
            program_id,
        ),
        &[
            user_ai.clone(),
            subscription_ai.clone(),
            system_program_ai.clone(),
        ],
        &[subscription_seeds],
    )?;
    let subscription = Subscription {
        active: false, // false, // NOTE
        mint: None,    // NOTE
        deposit_vault: *deposit_vault_ai.key,
        deposit_mint: *deposit_mint_ai.key,
        payee: *payee,
        amount: amount,
        duration: duration,
        next_renew_time: 0, // NOTE
        renewal_count: 0,
    };
    subscription.serialize(&mut *subscription_ai.try_borrow_mut_data()?)?;

    // initialize or increment counter account
    if count == 0 {
        let counter_size = 8;
        invoke_signed(
            &system_instruction::create_account(
                user_ai.key,
                counter_ai.key,
                rent::Rent::get()?.minimum_balance(8),
                counter_size as u64,
                program_id,
            ),
            &[
                user_ai.clone(),
                counter_ai.clone(),
                system_program_ai.clone(),
            ],
            &[counter_seeds],
        )?;
    }

    let counter = Counter {
        bump: counter_bump,
        count: count + 1,
    };
    counter.serialize(&mut *counter_ai.try_borrow_mut_data()?)?;

    Ok(())
}
