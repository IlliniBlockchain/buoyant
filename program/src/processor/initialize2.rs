use {
    crate::{
        state::{Counter, Subscription},
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

pub fn process_initialize2(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    payee: &Pubkey,
    amount: u64,
    duration: i64,
    start_amount: u64,
) -> ProgramResult {

    // Get accounts

    // Validate accounts

    // user - should be signer
    // user deposit token account - check pda, owned by user, mint is deposit mint
    // user subscription ownership token account - check pda
    //      should be owned by user, should have mint of sub ownership token mint
    // payee - check same as input - because you have to include this, you technically could
    //      could remove the input parameter, might be cleaner without
    // payee deposit token account - check pda, owner is payee, mint is deposit mint
    // subscription metadata - check pda
    // subscription counter - check pda
    // subscription ownership token mint - check pda
    // deposit vault - check pda, should be owned by subscription, should have deposit mint
    // deposit mint - check initialized
    // system program - check program
    // sysvar rent - check program
    // token program - check program
    // associated token program - check program

    // Execute instruction

    // initialize metadata account (system program create account)
    // initialize metadata
    // initialize deposit vault (associated token instr create account)
    // ensure user token account has enough funds
    // ensure start_amount > typical fee (refer to current renew instr for calculation)
    // initialize payee deposit token account if needed (associated token program create account)
    // send funds to payee (token program transfer)
    // send start_amount to deposit vault (token program transfer)
    // initialize sub ownership mint (token program initialize mint)
    // initialize user sub ownership token account (associated token instr create account)
    // mint first token to user (token program mint to)
    // freeze mint (token program freeze)
    // initialize counter if needed (system program create account)
    // increment counter

    Ok(())
}
