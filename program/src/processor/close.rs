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

pub fn process_close(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
) -> ProgramResult {
    Ok(())
}
