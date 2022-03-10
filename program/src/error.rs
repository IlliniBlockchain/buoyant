use num_derive::FromPrimitive;
use solana_program::program_error::ProgramError;
use thiserror::Error;

#[derive(Error, Debug, Copy, Clone, FromPrimitive, PartialEq)]
pub enum SubscriptionError {
    #[error("Error is sample.")]
    SampleError,
}

#[derive(Error, Debug, Copy, Clone, FromPrimitive, PartialEq)]
pub enum AccountError {
    #[error("Invalid vault owner.")]
    InvalidVaultOwner,
    #[error("Account balance insufficient for requested withdraw amount.")]
    InsufficientWithdrawBalance,
}

#[derive(Error, Debug, Copy, Clone, FromPrimitive, PartialEq)]
pub enum EchoError {
    #[error("Account must be writable.")]
    AccountMustBeWritable,
    #[error("Account not initialized.")]
    AccountNotInitialized,
    #[error("Missing required signature.")]
    MissingRequiredSignature,
    #[error("Invalid program address.")]
    InvalidProgramAddress,
    #[error("Invalid account address.")]
    InvalidAccountAddress,
    #[error("Default error.")]
    DefaultError,
    #[error("Instruction not implemented.")]
    NotImplemented,
}

impl From<SubscriptionError> for ProgramError {
    fn from(e: SubscriptionError) -> Self {
        ProgramError::Custom(e as u32)
    }
}

impl From<AccountError> for ProgramError {
    fn from(e: AccountError) -> Self {
        ProgramError::Custom(e as u32)
    }
}

impl From<EchoError> for ProgramError {
    fn from(e: EchoError) -> Self {
        ProgramError::Custom(e as u32)
    }
}
