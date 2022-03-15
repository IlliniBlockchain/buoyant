
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
    assert_msg(
        account.is_signer,
        ProgramError::MissingRequiredSignature,
        &format!("Missing required signature on account: {}", account.key),
    )
}

pub fn check_writable(account: &AccountInfo) -> ProgramResult {
    assert_msg(
        account.is_writable,
        ProgramError::MissingRequiredSignature,
        &format!("Account should be writable: {}", account.key),
    )
}

pub fn check_pda(account: &AccountInfo, seeds: &[&[u8]], program_id: &Pubkey) -> ProgramResult {
    let (pda, _) = Pubkey::find_program_address(seeds, program_id);
    assert_msg(
        *account.key == pda,
        UtilsError::InvalidProgramAddress.into(),
        &format!("Invalid PDA:\tExpected: {}\tGot: {}", &pda, account.key),
    )
}

/// Validate that given acount is indeed the associated token address of user (and mint) address
pub fn check_ata(
    account: &AccountInfo,
    user_address: &Pubkey,
    mint_address: &Pubkey,
) -> ProgramResult {
    // check pda
    let ata = get_associated_token_address(user_address, mint_address);
    assert_msg(
        *account.key == ata,
        UtilsError::InvalidProgramAddress.into(),
        &format!("Invalid ATA address:\tExpected: {}\tGot: {}", &ata, account.key)
    )
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
    assert_msg(
        *account.key == *program_id,
        ProgramError::IncorrectProgramId,
        &format!("Invalid program id:\tExpected: {}\tGot: {}", program_id, account.key)
    )
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
