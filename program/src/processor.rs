use {
    crate::{
        error::SubscriptionError,
        instruction::SubscriptionInstruction,
        state::{Counter, Subscription},
        utils::{
            check_ata, check_initialized_ata, check_pda, check_program_id, check_signer,
            check_writable,
        },
    },
    borsh::{BorshDeserialize, BorshSerialize},
    solana_program::{
        account_info::{next_account_info, AccountInfo},
        clock::Clock,
        entrypoint::ProgramResult,
        msg,
        program::{invoke, invoke_signed},
        program_error::ProgramError,
        program_pack::Pack,
        pubkey::Pubkey,
        system_instruction, system_program,
        sysvar::{rent, Sysvar},
    },
    spl_token::{error::TokenError, instruction, state::Account as TokenAccount, state::Mint},
};

// fee paid to renewers are currently fixed to 0.01 * amount
const FEE: u64 = 1;
const FEE_DECIMALS: u8 = 2;

pub mod withdraw;

pub struct Processor {}

impl Processor {
    pub fn process_instruction(
        program_id: &Pubkey,
        accounts: &[AccountInfo],
        instruction_data: &[u8],
    ) -> ProgramResult {
        let instruction = SubscriptionInstruction::try_from_slice(instruction_data)
            .map_err(|_| ProgramError::InvalidInstructionData)?;

        match instruction {
            SubscriptionInstruction::Initialize {
                payee,
                amount,
                duration,
            } => {
                msg!("Instruction: Initialize");
                msg!("payee: {}", payee);
                msg!("amount: {}", amount);
                msg!("duration: {}", duration);

                // get accounts
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

                // validate accounts

                // signer
                check_signer(user_ai)?;

                // PDAs
                let counter_seeds = &[
                    b"subscription_counter",
                    payee.as_ref(),
                    &amount.to_le_bytes(),
                    &duration.to_le_bytes(),
                ];
                check_pda(counter_ai, counter_seeds, program_id)?;
                let (_, counter_bump) = Pubkey::find_program_address(counter_seeds, program_id);
                let counter_seeds = &[
                    b"subscription_counter",
                    payee.as_ref(),
                    &amount.to_le_bytes(),
                    &duration.to_le_bytes(),
                    &[counter_bump],
                ];

                // check initialized
                let count: u64 = if counter_ai.data_len() == 0 {
                    0
                } else {
                    let counter_data = Counter::try_from_slice(&counter_ai.try_borrow_data()?)?;
                    counter_data.count
                };

                let subscription_seeds = &[
                    b"subscription_metadata",
                    payee.as_ref(),
                    &amount.to_le_bytes(),
                    &duration.to_le_bytes(),
                    &count.to_le_bytes(),
                ];
                check_pda(subscription_ai, subscription_seeds, program_id)?;
                let (_, subscription_bump) =
                    Pubkey::find_program_address(subscription_seeds, program_id);
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
                    payee: payee,
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

                let counter = Counter { count: count + 1 };
                counter.serialize(&mut *counter_ai.try_borrow_mut_data()?)?;
            }
            SubscriptionInstruction::Deposit { amount } => {
                msg!("Instruction: Deposit");
                msg!("amount: {}", amount);
            }
            SubscriptionInstruction::Withdraw { withdraw_amount, count } => {
                msg!("Instruction: Withdraw");
                msg!("withdraw_amount: {}", withdraw_amount);
                msg!("count: {}", count);
                withdraw::process_withdraw(program_id, accounts, withdraw_amount, count)?;
            }
            SubscriptionInstruction::Renew { count } => {
                msg!("Instruction: Renew");

                // GET ACCOUNTS
                let accounts_iter = &mut accounts.iter();

                let caller_ai = next_account_info(accounts_iter)?;
                let subscription_ai = next_account_info(accounts_iter)?;
                let deposit_mint_ai = next_account_info(accounts_iter)?;
                let deposit_vault_ai = next_account_info(accounts_iter)?;
                let payee_ai = next_account_info(accounts_iter)?;
                let payee_vault_ai = next_account_info(accounts_iter)?;
                let caller_vault_ai = next_account_info(accounts_iter)?;
                let new_mint_ai = next_account_info(accounts_iter)?;
                let payer_new_vault_ai = next_account_info(accounts_iter)?;
                let payer_old_vault_ai = next_account_info(accounts_iter)?;
                let payer_ai = next_account_info(accounts_iter)?;

                let system_program_ai = next_account_info(accounts_iter)?;
                let sysvar_rent_ai = next_account_info(accounts_iter)?;
                let token_program_ai = next_account_info(accounts_iter)?;
                let associated_token_program_ai = next_account_info(accounts_iter)?;

                // VALIDATE ACCOUNTS
                // signer/writable
                check_signer(caller_ai)?;
                check_writable(subscription_ai)?;
                check_writable(deposit_vault_ai)?;
                check_writable(payee_vault_ai)?;
                check_writable(caller_vault_ai)?;
                check_writable(new_mint_ai)?;
                check_writable(payer_new_vault_ai)?;

                // PDAs
                let mut subscription =
                    match Subscription::try_from_slice(&subscription_ai.try_borrow_data()?) {
                        Ok(sub) => sub,
                        Err(_) => {
                            msg!("Subscription being renewed for first time, i.e. no mint");
                            Subscription::try_from_slice(
                                &subscription_ai.try_borrow_data()?
                                    [0..subscription_ai.data_len() - 32],
                            )?
                        }
                    };

                let payee = subscription.payee;
                let amount = subscription.amount;
                let duration = subscription.duration;
                let subscription_seeds = &[
                    b"subscription_metadata",
                    payee.as_ref(),
                    &amount.to_le_bytes(),
                    &duration.to_le_bytes(),
                    &count.to_le_bytes(),
                ];
                check_pda(subscription_ai, subscription_seeds, program_id)?;

                let (_, subscription_bump) =
                    Pubkey::find_program_address(subscription_seeds, program_id);
                let subscription_seeds = &[
                    b"subscription_metadata",
                    payee.as_ref(),
                    &amount.to_le_bytes(),
                    &duration.to_le_bytes(),
                    &count.to_le_bytes(),
                    &[subscription_bump],
                ];

                // deposit mint
                if *deposit_mint_ai.key != subscription.deposit_mint {
                    return Err(TokenError::MintMismatch.into());
                }

                check_ata(
                    deposit_vault_ai,
                    subscription_ai.key,
                    &subscription.deposit_mint,
                )?;
                check_initialized_ata(
                    deposit_vault_ai,
                    subscription_ai.key,
                    &subscription.deposit_mint,
                )?;

                check_ata(payee_vault_ai, &payee, &subscription.deposit_mint)?;
                // check_initialized_ata(payee_vault_ai, &payee, &subscription.deposit_mint)?;

                check_ata(caller_vault_ai, caller_ai.key, &subscription.deposit_mint)?;
                // check_initialized_ata(caller_vault_ai, &payee, &subscription.deposit_mint)?;

                let new_mint_seeds = &[
                    b"subscription_mint",
                    subscription_ai.key.as_ref(),
                    &subscription.renewal_count.to_le_bytes(),
                ];
                check_pda(new_mint_ai, new_mint_seeds, program_id)?;
                let (_, new_mint_bump) = Pubkey::find_program_address(new_mint_seeds, program_id);
                let new_mint_seeds = &[
                    b"subscription_mint",
                    subscription_ai.key.as_ref(),
                    &subscription.renewal_count.to_le_bytes(),
                    &[new_mint_bump],
                ];

                check_ata(payer_new_vault_ai, payer_ai.key, new_mint_ai.key)?;

                if let Some(current_mint) = subscription.mint {
                    check_ata(payer_old_vault_ai, payer_ai.key, &current_mint)?;
                    check_initialized_ata(payer_old_vault_ai, payer_ai.key, &current_mint)?;
                }

                // programs
                check_program_id(system_program_ai, &system_program::id())?;
                check_program_id(sysvar_rent_ai, &rent::id())?;
                check_program_id(token_program_ai, &spl_token::id())?;
                check_program_id(
                    associated_token_program_ai,
                    &spl_associated_token_account::id(),
                )?;

                // LOGIC

                // check time, if not time, throw error
                let now = Clock::get()?.unix_timestamp;
                msg!("now: {}", now);
                let next_renew_time = subscription.next_renew_time;
                msg!("next_renew_time: {}", subscription.next_renew_time);
                if now < next_renew_time {
                    return Err(SubscriptionError::EarlyRenew.into());
                }

                // checks balance of deposit vault, if not enough, deactivate, return
                let deposit_vault =
                    TokenAccount::unpack_from_slice(&deposit_vault_ai.try_borrow_data()?)?;
                if deposit_vault.amount < amount {
                    if subscription.active == false {
                        msg!("Already deactivated, insufficient funds to renew.");
                        return Err(SubscriptionError::AlreadyExpired.into());
                    }
                    subscription.active = false;
                    subscription.serialize(&mut *subscription_ai.try_borrow_mut_data()?)?;
                    msg!("Insufficient funds: deactivating subscription.");
                    return Ok(());
                }

                // check possession of token from current mint, if not, throw error
                if let Some(current_mint) = subscription.mint {
                    let payer_old_vault =
                        TokenAccount::unpack_from_slice(&payer_old_vault_ai.try_borrow_data()?)?;
                    if payer_old_vault.mint != current_mint || payer_old_vault.amount == 0 {
                        return Err(SubscriptionError::InvalidReceiver.into());
                    }
                }

                // create token accounts for payee and caller if uninitialized
                if payee_vault_ai.data_len() == 0 {
                    invoke(
                        &spl_associated_token_account::create_associated_token_account(
                            caller_ai.key,
                            &payee,
                            &subscription.deposit_mint,
                        ),
                        &[
                            caller_ai.clone(),
                            payee_vault_ai.clone(),
                            payee_ai.clone(),
                            deposit_mint_ai.clone(),
                            system_program_ai.clone(),
                            token_program_ai.clone(),
                            sysvar_rent_ai.clone(),
                            associated_token_program_ai.clone(),
                        ],
                    )?;
                }
                if caller_vault_ai.data_len() == 0 {
                    invoke(
                        &spl_associated_token_account::create_associated_token_account(
                            caller_ai.key,
                            caller_ai.key,
                            &subscription.deposit_mint,
                        ),
                        &[
                            caller_ai.clone(),
                            caller_vault_ai.clone(),
                            caller_ai.clone(),
                            deposit_mint_ai.clone(),
                            system_program_ai.clone(),
                            token_program_ai.clone(),
                            sysvar_rent_ai.clone(),
                            associated_token_program_ai.clone(),
                        ],
                    )?;
                }

                // transfer to payee, transfer to caller, create mint, mint token
                msg!("Sufficient funds: performing payouts and minting new token.");
                let base: u32 = 10;
                let caller_amount =
                    (amount as f64 * FEE as f64 / base.pow(FEE_DECIMALS.into()) as f64) as u64;
                let payee_amount = amount - caller_amount;

                // transfer to payee
                msg!("Transferring funds to payee...");
                invoke_signed(
                    &instruction::transfer(
                        &spl_token::id(),
                        deposit_vault_ai.key,
                        payee_vault_ai.key,
                        subscription_ai.key,
                        &[],
                        payee_amount,
                    )?,
                    &[
                        deposit_vault_ai.clone(),
                        payee_vault_ai.clone(),
                        subscription_ai.clone(),
                    ],
                    &[subscription_seeds],
                )?;

                // transfer to caller
                msg!("Transferring funds to caller...");
                invoke_signed(
                    &instruction::transfer(
                        &spl_token::id(),
                        deposit_vault_ai.key,
                        caller_vault_ai.key,
                        subscription_ai.key,
                        &[],
                        caller_amount,
                    )?,
                    &[
                        deposit_vault_ai.clone(),
                        caller_vault_ai.clone(),
                        subscription_ai.clone(),
                    ],
                    &[subscription_seeds],
                )?;

                // create mint
                // initialize account
                msg!("Creating new mint account...");
                invoke_signed(
                    &system_instruction::create_account(
                        caller_ai.key,
                        new_mint_ai.key,
                        rent::Rent::get()?.minimum_balance(Mint::get_packed_len()),
                        Mint::get_packed_len() as u64,
                        &spl_token::id(),
                    ),
                    &[
                        caller_ai.clone(),
                        new_mint_ai.clone(),
                        system_program_ai.clone(),
                    ],
                    &[new_mint_seeds],
                )?;

                // initialize mint
                msg!("Initializing new mint account...");
                let new_mint_decimals = 0;
                invoke_signed(
                    &spl_token::instruction::initialize_mint(
                        &spl_token::id(),
                        new_mint_ai.key,
                        subscription_ai.key,
                        Some(subscription_ai.key),
                        new_mint_decimals,
                    )?,
                    &[
                        new_mint_ai.clone(),
                        sysvar_rent_ai.clone(),
                        token_program_ai.clone(),
                    ],
                    &[new_mint_seeds],
                )?;

                // initialize associated token account for new token
                msg!("Creating new associated token account for new token...");
                invoke(
                    &spl_associated_token_account::create_associated_token_account(
                        caller_ai.key,
                        payer_ai.key,
                        new_mint_ai.key,
                    ),
                    &[
                        caller_ai.clone(),
                        payer_new_vault_ai.clone(),
                        payer_ai.clone(),
                        new_mint_ai.clone(),
                        system_program_ai.clone(),
                        token_program_ai.clone(),
                        sysvar_rent_ai.clone(),
                        associated_token_program_ai.clone(),
                    ],
                )?;

                // mint token
                msg!("Minting new token...");
                invoke_signed(
                    &instruction::mint_to(
                        &spl_token::id(),
                        new_mint_ai.key,
                        payer_new_vault_ai.key,
                        subscription_ai.key,
                        &[subscription_ai.key],
                        1,
                    )?,
                    &[
                        new_mint_ai.clone(),
                        payer_new_vault_ai.clone(),
                        subscription_ai.clone(),
                    ],
                    &[subscription_seeds],
                )?;

                msg!("Updating subscription metadata...");
                subscription.active = true;
                subscription.mint = Some(*new_mint_ai.key);
                subscription.next_renew_time = now + duration;
                subscription.renewal_count += 1;
                subscription.serialize(&mut *subscription_ai.try_borrow_mut_data()?)?;
            }
            SubscriptionInstruction::Close {} => {
                msg!("Instruction: Close");
            }
        }

        Ok(())
    }
}
