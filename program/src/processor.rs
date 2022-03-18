use {
    crate::instruction::SubscriptionInstruction,
    borsh::BorshDeserialize,
    solana_program::{
        account_info::AccountInfo, entrypoint::ProgramResult, msg, program_error::ProgramError,
        pubkey::Pubkey,
    },
};

pub mod initialize;
pub mod renew;
pub mod deposit;

use spl_token::*;

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
                initialize::process_initialize(program_id, accounts, &payee, amount, duration)?;
            }
            SubscriptionInstruction::Deposit { amount } => {
                msg!("Instruction: Deposit");
                msg!("amount: {}", amount);
                deposit::deposit_to(accounts, amount)?;
            }
            SubscriptionInstruction::Withdraw { amount } => {
                msg!("Instruction: Withdraw");
                msg!("amount: {}", amount);
            }
            SubscriptionInstruction::Renew { count } => {
                msg!("Instruction: Renew");
                renew::process_renew(program_id, accounts, count)?;
            }
            SubscriptionInstruction::Close {} => {
                msg!("Instruction: Close");
            }
        }
        
        Ok(())
    }
}
