use num_derive::FromPrimitive;
use solana_program::program_error::ProgramError;
use thiserror::Error;

#[derive(Error, Debug, Copy, Clone, FromPrimitive, PartialEq)]
pub enum SubscriptionError {
    #[error("Error is sample.")]
    SampleError,
    #[error("Too early for renewal.")]
    EarlyRenew,
    #[error("Receiver of renewed token is not owner of subscription.")]
    InvalidReceiver,
    #[error("Already expired.")]
    AlreadyExpired,
    #[error("Invalid vault owner.")]
    InvalidVaultOwner,
    #[error("Account balance insufficient for requested withdraw amount.")]
    InsufficientWithdrawBalance,
}

impl From<SubscriptionError> for ProgramError {
    fn from(e: SubscriptionError) -> Self {
        ProgramError::Custom(e as u32)
    }
}
