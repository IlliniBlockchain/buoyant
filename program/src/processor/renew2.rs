use {
    crate::{
        state::{Counter2, Subscription2},
        utils::{check_ata, check_pda, check_program_id, check_signer, check_writable},
    },
    borsh::{BorshDeserialize, BorshSerialize},
    solana_program::{
        account_info::{next_account_info, AccountInfo},
        entrypoint::ProgramResult,
        program::{invoke, invoke_signed},
        pubkey::Pubkey,
        system_instruction, system_program,
        sysvar::{rent, Sysvar},
    },
};

pub fn process_renew2(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
) -> ProgramResult {

    // Get accounts

    let accounts_iter = &mut accounts.iter();
    let caller_ai = next_account_info(accounts_iter)?;
    let caller_deposit_ai = next_account_info(accounts_iter)?;
    let payee = next_account_info(accounts_iter)?;
    let payee_deposit = next_account_info(accounts_iter)?;
    let subscription_ai = next_account_info(accounts_iter)?;
    let deposit_vault_ai = next_account_info(accounts_iter)?;
    let deposit_mint = next_account_info(accounts_iter)?;
    let system_program_ai = next_account_info(accounts_iter)?;
    let sysvar_rent_ai = next_account_info(accounts_iter)?;
    let token_program_ai = next_account_info(accounts_iter)?;
    let associated_token_program_ai = next_account_info(accounts_iter)?;
    
    // Validate accounts

    // caller - check signer
    // caller deposit token account - check pda, owner is caller, mint is deposit mint
    // payee - check same as subscription payee
    // payee deposit token account - check pda, owner is payee, mint is deposit mint
    // subscription metadata - check pda
    // deposit vault - check pda, check same as subscription.deposit_vault, owner is
    //      subscription, mint is deposit mint
    // deposit mint - check initialized, check same as subscription.deposit_mint
    // system program - check program
    // sysvar rent - check program
    // token program - check program
    // associated token program - check program

    // Execute instruction

    // if time is not up yet, revert
    // calculate fee/transfer amount - should account for leaving minimum fee in deposit vault
    // if deposit vault as insufficient funds
    //      expire
    //          send fee funds to caller (initialize token account if needed)
    //          mark subscription metadata active status to false
    // if deposit vault has sufficient funds
    //      renew
    //          send fee funds to caller (initialize token account if needed)
    //          send funds to payee (initialize token account if needed)
    //          mark subscription metadata active status to true
    //          set new next renew time

    Ok(())
}
