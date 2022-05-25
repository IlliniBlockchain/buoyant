use solana_program::{
    account_info::next_account_info, account_info::AccountInfo, entrypoint::ProgramResult, msg,
    program::invoke, program_error::ProgramError, program_pack::Pack,
};

use spl_token::*;

use crate::utils::{check_program_id, check_signer, check_writable};

pub fn process_deposit(accounts: &[AccountInfo], amount: u64) -> ProgramResult {
    // get accounts
    let accounts_iter = &mut accounts.iter();

    let payer = next_account_info(accounts_iter)?;
    let payer_token = next_account_info(accounts_iter)?;
    let vault = next_account_info(accounts_iter)?;

    let token_program_ai = next_account_info(accounts_iter)?;

    // check program id with spl_token
    check_program_id(token_program_ai, &spl_token::id())?;

    check_signer(payer)?;
    check_writable(payer)?;
    check_writable(payer_token)?;
    check_writable(vault)?;

    // this function does some stuff by making the account a "token account"
    let payer_token_account =
        spl_token::state::Account::unpack_from_slice(&payer_token.try_borrow_data()?)?;
    let vault_token =
        spl_token::state::Account::unpack_from_slice(&payer_token.try_borrow_data()?)?;

    // validate token account's owner
    if payer_token_account.owner != *payer.key {
        return Err(spl_token::error::TokenError::OwnerMismatch.into());
    }

    // check if the token account and vault are the same type
    if vault_token.mint != payer_token_account.mint {
        msg!("Incorrect token account mint.");
        return Err(spl_token::error::TokenError::MintMismatch.into());
    }

    // invoke: transfer of tokens "amount" to the vault
    invoke(
        &spl_token::instruction::transfer(
            token_program_ai.key,
            &payer_token.key,
            &vault.key,
            &payer.key,
            &[],
            amount as u64,
        )?,
        &[
            token_program_ai.clone(),
            payer_token.clone(),
            vault.clone(),
            payer.clone(),
        ],
    )?;

    Ok(())
}