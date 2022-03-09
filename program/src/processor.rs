use {
    borsh::BorshDeserialize,

    solana_program::{
        account_info::{next_account_info, AccountInfo}, entrypoint::ProgramResult, msg, program_error::ProgramError,
        pubkey::Pubkey,
        program_pack::Pack,
    },
    spl_token::{
        *,
        error::*,
        state::Account as TokenAccount,
    },

    crate::{
        instruction::SubscriptionInstruction,
        state::Subscription,
        utils::{
            assert_msg, check_signer, check_pda,
        },
    }
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
            SubscriptionInstruction::Initialize { payee, amount, duration } => {
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

                // deserialization
                let subscription = Subscription::try_from_slice(&subscription_ai.try_borrow_data()?)?;
                let deposit_vault = TokenAccount::unpack_from_slice(&deposit_vault_ai.try_borrow_data()?)?;



                // validate accounts

                // signer

                // PDAs

                // token account match mint

                // programs



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
