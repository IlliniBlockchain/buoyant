use {
    crate::{
        error::SubscriptionError,
        instruction::SubscriptionInstruction,
        state::{Counter, Subscription},
        utils::{
            assert_msg, check_ata, check_initialized_ata, check_pda, check_program_id, check_signer,
            check_writable,
        },
    },
    borsh::{BorshDeserialize, BorshSerialize},
    solana_program::{
        account_info::{next_account_info, AccountInfo},
        clock::Clock,
        entrypoint::ProgramResult,
        msg,
        program::{invoke, invoke_signed},
        program_error::ProgramError,
        program_pack::Pack,
        pubkey::Pubkey,
        system_instruction, system_program,
        sysvar::{rent, Sysvar},
    },
    spl_token::{error::TokenError, state::Account as TokenAccount, state::Mint},
};

struct Context<'a, 'b: 'a> {
    payer_ai: &'a AccountInfo<'b>,
    payer_token_account: TokenAccount,
    payer_token_account_ai: &'a AccountInfo<'b>,
    deposit_vault_ai: &'a AccountInfo<'b>,
    subscription_metadata_ai: &'a AccountInfo<'b>,
    token_program_ai: &'a AccountInfo<'b>,
}

impl<'a, 'b: 'a> Context<'a, 'b> {
    pub fn parse(accounts: &'a [AccountInfo<'b>]) -> Result<Self, ProgramError> {
        let account_info_iter = &mut accounts.iter();

        let payer_ai = next_account_info(account_info_iter)?;
        let payer_token_account_ai = next_account_info(account_info_iter)?; // SPL token account
        let deposit_vault_ai = next_account_info(account_info_iter)?;
        let subscription_metadata_ai = next_account_info(account_info_iter)?;
        let token_program_ai = next_account_info(account_info_iter)?;

        check_signer(payer_ai);
        [payer_ai, payer_token_account_ai, deposit_vault_ai].iter().map(|x| check_writable(x));

        // Deserialize token account
        let payer_token_account = TokenAccount::unpack_from_slice(&payer_token_account_ai.try_borrow_data()?)?;

        Ok(Self {
            payer_ai,
            payer_token_account,
            payer_token_account_ai,
            deposit_vault_ai,
            subscription_metadata_ai,
            token_program_ai,
        })
    }
}

pub fn process(program_id: &Pubkey, accounts: &[AccountInfo], amount: u64) -> ProgramResult {
    let ctx = Context::parse(accounts)?;

    // Validations
    assert_msg(
        ctx.payer_token_account.owner == *ctx.payer_ai.key,
        SubscriptionError::InvalidVaultOwner.into(),
        "Invalid vault owner",
    )?;

    // NOTE: do we check for insufficient amount
    // or do we just pass it to spl_token to deal separately?

    msg!("Transferring funds to owner...");
    // spl token instruction
    let instruction = &spl_token::instruction::transfer(
        &spl_token::id(),
        ctx.deposit_vault_ai.key,
        ctx.payer_token_account_ai.key,
        ctx.payer_ai.key,
        &[],
        amount,
    )?;
    let withdrawal_seeds = &[
        b"withdrawal_metadata",
        ctx.deposit_vault_ai.key.as_ref(),
        ctx.payer_ai.key.as_ref(),
        &amount.to_le_bytes(),
    ];
    
    invoke_signed(
        instruction,
        &[
            ctx.deposit_vault_ai.clone(),
            ctx.payer_token_account_ai.clone(),
            ctx.payer_ai.clone(),
        ],
        &[withdrawal_seeds],
    )?;

    Ok(())
}

// test cases:
