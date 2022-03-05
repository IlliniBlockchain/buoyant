use num_derive::FromPrimitive;
use solana_program::program_error::ProgramError;
use thiserror::Error;

#[derive(Error, Debug, Copy, Clone, FromPrimitive, PartialEq)]
pub enum SubscriptionError {
    #[error("Error is sample.")]
    SampleError,
}

impl From<SubscriptionError> for ProgramError {
    fn from(e: SubscriptionError) -> Self {
        ProgramError::Custom(e as u32)
    }
}