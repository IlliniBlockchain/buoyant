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
}

use borsh::BorshDeserialize;

use crate::error::{AccountError, EchoError};

struct Context<'a, 'b: 'a> {
    payer: &'a AccountInfo<'b>,
    payer_token_account: &'a AccountInfo<'b>,
    deposit_vault: &'a AccountInfo<'b>,
    subscription_metadata: &'a AccountInfo<'b>,
    token_program: &'a AccountInfo<'b>,
}

impl<'a, 'b: 'a> Context<'a, 'b> {
    pub fn parse(accounts: &'a [AccountInfo<'b>]) -> Result<Self, ProgramError> {
        let accounts_iter = &mut accounts.iter();

        let mut ctx = Self {
            payer: next_account_info(accounts_iter)?,
            payer_token_account: next_account_info(accounts_iter)?, // SPL toke naccount
            deposit_vault: next_account_info(accounts_iter)?,
            subscription_metadata: next_account_info(accounts_iter)?,
            token_program: next_account_info(accounts_iter)?,
        };

        if !ctx.payer.is_writable {
            msg!("Payer must be writable");
            return Err(EchoError::AccountMustBeWritable.into());
        }

        if !ctx.payer.is_signer {
            msg!("Payer must be signer");
            return Err(EchoError::AccountMustBeWritable.into());
        }

        if !ctx.payer_token_account.is_writable {
            msg!("Payer token account must be writable");
            return Err(EchoError::AccountMustBeWritable.into());
        }

        if !ctx.deposit_vault.is_writable {
            msg!("Deposit vault must be writable");
            return Err(EchoError::AccountMustBeWritable.into());
        }

        Ok(ctx)
    }
}

pub fn process(program_id: &Pubkey, accounts: &[AccountInfo], amount: u64) -> ProgramResult {
    let ctx = Context::parse(accounts)?;

    ctx.payer_token_account_spl = TokenAccount(payer_token_account)

    // Transfer to self... ???
    if ctx.payer.key == ctx.deposit_vault.key {
        return Ok(());
    }

    // Check that payer is owner of vault
    assert(
        &ctx.deposit_vault.owner != *ctx.payer.key,
        AccountError::InvalidVaultOwner.into(),
        "Invalid",
    )
    if &ctx.deposit_vault.owner != *ctx.payer.key {
        return Err(AccountError::InvalidVaultOwner.into());
    }

    // TODO: include gas
    if ctx.deposit_vault.lamports() < amount {
        return Err(AccountError::InsufficientWithdrawBalance.into());
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






        /// Wrapper on transfer function. Withdraws token from deposit vault
    /// as long as caller is rightful owner.
    ///
    /// Accounts expected by this instruction:

    let buffer = &mut (*ctx.authorized_buffer.data).borrow_mut();

    // check the size of the account before trying to read it
    if buffer.len() < AUTH_BUFF_HEADER_SIZE {
        msg!("Invalid authorized buffer size, {}", buffer.len());
        return Err(EchoError::AccountNotInitialized.into());
    }

    // in order to validate the PDA address, we first read it to access the buffer seed
    let buffer_header = AuthorizedBufferHeader::try_from_slice(&buffer[..AUTH_BUFF_HEADER_SIZE])?;

    // verify that the PDA account is the correct address
    let pda = Pubkey::create_program_address(
        &[
            b"authority",
            ctx.authority.key.as_ref(),
            &buffer_header.buffer_seed.to_le_bytes(),
            &[buffer_header.bump_seed],
        ],
        program_id,
    )?;

    if pda != *ctx.authorized_buffer.key {
        msg!("Invalid account address or authority");
        return Err(EchoError::InvalidAccountAddress.into());
    }

    // this is the 'rest' of the account's data (beyond the header info)
    let buffer_data = &mut buffer[AUTH_BUFF_HEADER_SIZE..];

    // loop over each byte in the rest of account's data
    for index in 0..buffer_data.len() {
        buffer_data[index] = match index < data.len() {
            true => data[index],
            false => 0,
        };
    }

    Ok(())
}

// test cases:
