use {
    crate::{
        instruction::SubscriptionInstruction,
        state::Subscription,
        utils::{assert_msg, check_ata, check_pda, check_program_id, check_signer},
    },
    borsh::BorshDeserialize,
    solana_program::{
        account_info::{next_account_info, AccountInfo},
        entrypoint::ProgramResult,
        msg,
        program::{invoke, invoke_signed},
        program_error::ProgramError,
        program_pack::Pack,
        pubkey::Pubkey,
        system_program, sysvar,
    },
    spl_token::{error::*, state::Account as TokenAccount, *},
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
                let subscription_seeds = &[
                    b"subscription_metadata",
                    payee.as_ref(),
                    &amount.to_le_bytes(),
                    &duration.to_le_bytes(),
                ];
                check_pda(subscription_ai, subscription_seeds, program_id)?;

                // token accounts
                check_ata(deposit_vault_ai, subscription_ai.key, deposit_mint_ai.key);

                // programs
                check_program_id(system_program_ai, &system_program::id())?;
                check_program_id(sysvar_rent_ai, &sysvar::rent::id())?;
                check_program_id(token_program_ai, &spl_token::id())?;
                check_program_id(
                    associated_token_program_ai,
                    &spl_associated_token_account::id(),
                )?;

                // logic

                // initialize deposity vault

                // initialize subscription metadata account
            }
            SubscriptionInstruction::Deposit { amount } => {
                msg!("Instruction: Deposit");
                msg!("amount: {}", amount);
            }
            SubscriptionInstruction::Withdraw { amount } => {
                msg!("Instruction: Withdraw");
                msg!("amount: {}", amount);
            }
            SubscriptionInstruction::Renew {} => {
                msg!("Instruction: Renew ");
                // create new mint
                // update metadata
                // check enough balance
                // transfer balance + mint new token
            }
            SubscriptionInstruction::Close {} => {
                msg!("Instruction: Close");
            }
        }

        Ok(())
    }
}
