use num_derive::FromPrimitive;
use solana_program::{
    account_info::AccountInfo, entrypoint::ProgramResult, msg, program_error::ProgramError,
    program_pack::Pack, pubkey::Pubkey,
};
use spl_associated_token_account::*;
use spl_token::{error::TokenError, state::Account as TokenAccount, *};
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

pub fn check_ata(
    account: &AccountInfo,
    user_address: &Pubkey,
    mint_address: &Pubkey,
) -> ProgramResult {
    // check pda
    let ata = get_associated_token_address(user_address, mint_address);
    if *account.key != ata {
        Err(UtilsError::InvalidProgramAddress.into())
    } else {
        Ok(())
    }
}

pub fn check_initialized_ata(
    account: &AccountInfo,
    user_address: &Pubkey,
    mint_address: &Pubkey,
) -> ProgramResult {
    // check account owned by token program
    if *account.owner != spl_token::id() {
        return Err(ProgramError::IllegalOwner.into());
    }

    // check token owner and mint
    let token_account = TokenAccount::unpack_from_slice(&account.try_borrow_data()?)?;
    if token_account.owner != *user_address {
        return Err(TokenError::OwnerMismatch.into());
    }
    if token_account.mint != *mint_address {
        return Err(TokenError::MintMismatch.into());
    }
    Ok(())
}

pub fn check_program_id(account: &AccountInfo, program_id: &Pubkey) -> ProgramResult {
    if *account.key != *program_id {
        Err(ProgramError::IncorrectProgramId)
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
