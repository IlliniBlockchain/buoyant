use borsh::BorshDeserialize;
use solana_program::{
    account_info::AccountInfo, entrypoint::ProgramResult, msg, program_error::ProgramError,
    pubkey::Pubkey,
};

use spl_token::*;

use crate::instruction::SubscriptionInstruction;

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
                // validate accounts
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
