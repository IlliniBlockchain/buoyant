use solana_program::{account_info::AccountInfo, entrypoint::ProgramResult, msg, program_error::ProgramError, pubkey::Pubkey};
use spl_token::*;
use num_derive::FromPrimitive;
use thiserror::Error;

pub fn assert_msg(statement: bool, err: ProgramError, msg: &str) -> ProgramResult {
    if !statement {
        msg!(msg);
        Err(err)
    } else {
        Ok(())
    }
}

pub fn check_signer(account: &AccountInfo) -> ProgramResult {
    if !account.is_signer {
        msg!("Missing required signature on account: {}", account.key);
        Err(ProgramError::MissingRequiredSignature)
    } else {
        Ok(())
    }
}

pub fn check_pda(account: &AccountInfo, seeds: &[&[u8]], program_id: &Pubkey) -> ProgramResult {
    let (pda, bump) = Pubkey::find_program_address(seeds, program_id);
    if *account.key != pda {
        Err(UtilsError::InvalidProgramAddress.into())
    } else {
        Ok(())
    }
}


#[derive(Error, Debug, Copy, Clone, FromPrimitive, PartialEq)]
pub enum UtilsError {
    #[error("Invalid program address.")]
    InvalidProgramAddress,
}

impl From<UtilsError> for ProgramError {
    fn from(e: UtilsError) -> Self {
        ProgramError::Custom(e as u32)
    }
}