use num_derive::FromPrimitive;
use solana_program::{
    account_info::AccountInfo, entrypoint::ProgramResult, msg, program_error::ProgramError,
    program_pack::Pack, pubkey::Pubkey,
};
use spl_associated_token_account::*;
use spl_token::{error::TokenError, state::Account as TokenAccount};
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

pub fn check_writable(account: &AccountInfo) -> ProgramResult {
    if !account.is_writable {
        msg!("Account should be writable: {}", account.key);
        Err(ProgramError::MissingRequiredSignature)
    } else {
        Ok(())
    }
}

pub fn check_pda(account: &AccountInfo, seeds: &[&[u8]], program_id: &Pubkey) -> ProgramResult {
    let (pda, _) = Pubkey::find_program_address(seeds, program_id);
    if *account.key != pda {
        msg!("Invalid PDA:\tExpected: {}\tGot: {}", &pda, account.key);
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
        msg!("Invalid ATA address:\tExpected: {}\tGot: {}", &ata, account.key);
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
        msg!("ATA not owned by token program: {}", account.key);
        return Err(ProgramError::IllegalOwner.into());
    }

    // check token owner and mint
    let token_account = TokenAccount::unpack_from_slice(&account.try_borrow_data()?)?;
    if token_account.owner != *user_address {
        msg!("ATA invalid user owner:\tExpected: {}\tGot: {}", user_address, token_account.owner);
        return Err(TokenError::OwnerMismatch.into());
    }
    if token_account.mint != *mint_address {
        msg!("ATA invalid mint:\tExpected: {}\tGot: {}", mint_address, token_account.mint);
        return Err(TokenError::MintMismatch.into());
    }
    Ok(())
}

pub fn check_program_id(account: &AccountInfo, program_id: &Pubkey) -> ProgramResult {
    if *account.key != *program_id {
        msg!("Invalid program id:\tExpected: {}\tGot: {}", program_id, account.key);
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
