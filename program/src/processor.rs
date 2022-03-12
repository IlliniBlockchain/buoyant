use {
    crate::{
        instruction::SubscriptionInstruction,
        state::{Subscription, Counter},
        utils::{check_ata, check_initialized_ata, check_pda, check_program_id, check_signer, check_writable},
    },
    borsh::{BorshSerialize, BorshDeserialize},
    solana_program::{
        account_info::{next_account_info, AccountInfo},
        entrypoint::ProgramResult,
        msg,
        program::{invoke, invoke_signed},
        program_error::ProgramError,
        program_pack::Pack,
        pubkey::Pubkey,
        system_instruction,
        system_program,
        sysvar::{rent, Sysvar},
    },
    spl_token::{error::TokenError, state::Account as TokenAccount},
};

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
                let subscription_size = 1 + 1+32 + 32 + 32 + 32 + 8 + 8 + 8 + 8; // 162
                invoke_signed(
                    &system_instruction::create_account(
                        user_ai.key,
                        subscription_ai.key,
                        rent::Rent::get()?.minimum_balance(subscription_size),
                        subscription_size as u64,
                        program_id,
                    ),
                    &[user_ai.clone(), subscription_ai.clone(), system_program_ai.clone()],
                    &[subscription_seeds],
                )?;
            
                let subscription = Subscription {
                    active: false, // false, // NOTE
                    mint: None, // NOTE
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
                        &[user_ai.clone(), counter_ai.clone(), system_program_ai.clone()],
                        &[counter_seeds],
                    )?;
                }

                let counter = Counter {
                    count: count + 1,
                };
                counter.serialize(&mut *counter_ai.try_borrow_mut_data()?)?;

            }
            SubscriptionInstruction::Deposit { amount } => {
                msg!("Instruction: Deposit");
                msg!("amount: {}", amount);
            }
            SubscriptionInstruction::Withdraw { amount } => {
                msg!("Instruction: Withdraw");
                msg!("amount: {}", amount);
            }
            SubscriptionInstruction::Renew { count, payer } => {
                msg!("Instruction: Renew");

                // GET ACCOUNTS
                let accounts_iter = &mut accounts.iter();

                let caller_ai = next_account_info(accounts_iter)?;
                let subscription_ai = next_account_info(accounts_iter)?;
                let deposit_vault_ai = next_account_info(accounts_iter)?;
                let payee_vault_ai = next_account_info(accounts_iter)?;
                let caller_vault_ai = next_account_info(accounts_iter)?;
                let new_mint_ai = next_account_info(accounts_iter)?;
                let payer_new_vault_ai = next_account_info(accounts_iter)?;
                let payer_old_vault_ai = next_account_info(accounts_iter)?;

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
                let subscription = match Subscription::try_from_slice(&subscription_ai.try_borrow_data()?) {
                    Ok(sub) => sub,
                    Err(_) => {
                        msg!("Subscription being renewed for first time, i.e. no mint");
                        Subscription::try_from_slice(&subscription_ai.try_borrow_data()?[0..subscription_ai.data_len()-32])?
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

                check_ata(deposit_vault_ai, subscription_ai.key, &subscription.deposit_mint)?;
                check_initialized_ata(deposit_vault_ai, subscription_ai.key, &subscription.deposit_mint)?;

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

                check_ata(payer_new_vault_ai, &payer, new_mint_ai.key)?;

                if let Some(current_mint) = subscription.mint {
                    check_ata(payer_old_vault_ai, &payer, &current_mint)?;
                    check_initialized_ata(payer_old_vault_ai, &payer, &current_mint)?;
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

                // checks balance, if not enough, deactivate, return

                // check possession of token from current mint, if not, throw error

                // transfer to payee, transfer to caller, create mint, mint token

            }
            SubscriptionInstruction::Close {} => {
                msg!("Instruction: Close");
            }
        }

        Ok(())
    }
}
