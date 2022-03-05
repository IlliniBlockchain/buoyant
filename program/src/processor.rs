use borsh::BorshDeserialize;
use solana_program::{
    account_info::AccountInfo, entrypoint::ProgramResult, msg, program_error::ProgramError,
    pubkey::Pubkey,
};

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
            SubscriptionInstruction::Initialize { } => {
                msg!("Instruction: Initialize");
            }
            SubscriptionInstruction::Deposit { } => {
                msg!("Instruction: Deposit");
            }
            SubscriptionInstruction::Renew { } => {
                msg!("Instruction: Renew ");
            }
            SubscriptionInstruction::Close { } => {
                msg!("Instruction: Close");
            }
        }

        Ok(())
    }
}
