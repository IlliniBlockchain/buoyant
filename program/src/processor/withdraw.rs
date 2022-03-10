use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    msg,
    program_error::ProgramError,
    program_pack::Pack,
    pubkey::Pubkey,
    program::invoke,
    system_instruction,
};

use spl_token::{
    instruction,
    state::{Account as TokenAccount},
};

use borsh::BorshDeserialize;

use crate::{error::{SubscriptionError, EchoError}, utils::assert_msg};

struct Context<'a, 'b: 'a> {
    payer: &'a AccountInfo<'b>,
    payer_token_account: TokenAccount,
    payer_token_account_ai: &'a AccountInfo<'b>,
    deposit_vault: &'a AccountInfo<'b>,
    subscription_metadata: &'a AccountInfo<'b>,
    token_program: &'a AccountInfo<'b>,
}

impl<'a, 'b: 'a> Context<'a, 'b> {
    pub fn parse(accounts: &'a [AccountInfo<'b>]) -> Result<Self, ProgramError> {
        let accounts_iter = &mut accounts.iter();

        let payer = next_account_info(accounts_iter)?;
        let payer_token_account_ai = next_account_info(accounts_iter)?; // SPL token account
        let deposit_vault = next_account_info(accounts_iter)?;
        let subscription_metadata = next_account_info(accounts_iter)?;
        let token_program = next_account_info(accounts_iter)?;

        if !payer.is_writable {
            msg!("Payer must be writable");
            return Err(EchoError::AccountMustBeWritable.into());
        }

        if !payer.is_signer {
            msg!("Payer must be signer");
            return Err(EchoError::AccountMustBeWritable.into());
        }

        if !payer_token_account_ai.is_writable {
            msg!("Payer token account must be writable");
            return Err(EchoError::AccountMustBeWritable.into());
        }

        if !deposit_vault.is_writable {
            msg!("Deposit vault must be writable");
            return Err(EchoError::AccountMustBeWritable.into());
        }

        // Deserialize token account
        let payer_token_account = TokenAccount::unpack_from_slice(&payer_token_account_ai.try_borrow_data()?)?;

        Ok(Self {
            payer,
            payer_token_account,
            payer_token_account_ai,
            deposit_vault,
            subscription_metadata,
            token_program,
        })
    }
}

pub fn process(program_id: &Pubkey, accounts: &[AccountInfo], amount: u64) -> ProgramResult {
    let ctx = Context::parse(accounts)?;

    // Validations
    assert_msg(
        ctx.payer_token_account.owner != *ctx.payer.key,
        SubscriptionError::InvalidVaultOwner.into(),
        "Invalid vault owner",
    )?;


    // Transfer to self... ???
    if ctx.payer.key == ctx.deposit_vault.key {
        return Ok(());
    }

    if *ctx.deposit_vault.owner != *ctx.payer.key {
        return Err(SubscriptionError::InvalidVaultOwner.into());
    }

    // TODO: include gas
    if ctx.deposit_vault.lamports() < amount {
        return Err(SubscriptionError::InsufficientWithdrawBalance.into());
    }

    // Transfer
    let instruction = system_instruction::transfer(&ctx.deposit_vault.key, &ctx.payer_token_account.key, amount);

    invoke(
        &instruction,
        &[
            ctx.deposit_vault.clone(),
            ctx.payer_token_account.clone(),
        ],
    )?;

    msg!(
        "[Buoyant] Withdraw completed. Owner balance: {}",
        ctx.payer_token_account.lamports()
    );

    Ok(())
}

// test cases:
