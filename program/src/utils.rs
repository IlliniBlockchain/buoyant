use solana_program::{entrypoint::ProgramResult, msg, program_error::ProgramError, pubkey::Pubkey};

pub fn assert_msg(statement: bool, err: ProgramError, msg: &str) -> ProgramResult {
    if !statement {
        msg!(msg);
        Err(err)
    } else {
        Ok(())
    }
}