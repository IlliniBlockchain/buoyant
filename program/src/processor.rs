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
pub mod initialize2;
pub mod renew2;
pub mod close;

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
                deposit::process_deposit(accounts, amount)?;
            }
            SubscriptionInstruction::Withdraw { amount } => {
                msg!("Instruction: Withdraw");
                msg!("amount: {}", amount);
            }
            SubscriptionInstruction::Renew { count } => {
                msg!("Instruction: Renew");
                renew::process_renew(program_id, accounts, count)?;
            }
            SubscriptionInstruction::Initialize2 { payee, amount, duration, start_amount} => {
                msg!("Instruction: Initialize2");
                msg!("payee: {}", payee);
                msg!("amount: {}", amount);
                msg!("duration: {}", duration);
                msg!("start_amount: {}", start_amount);
                initialize2::process_initialize2(program_id, accounts, &payee, amount, duration, start_amount)?;
            }
            SubscriptionInstruction::Renew2 {} => {
                msg!("Instruction: Renew2");
                renew2::process_renew2(program_id, accounts)?;
            }
            SubscriptionInstruction::Close {} => {
                msg!("Instruction: Close");
                close::process_close(program_id, accounts)?;
            }
            SubscriptionInstruction::Registry { count } => {
                msg!("Instruction: Registry");
            }
        }
        
        Ok(())
    }
}
