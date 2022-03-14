use {
    crate::{
        error::SubscriptionError,
        instruction::SubscriptionInstruction,
        state::{Subscription},
        utils::{
            assert_msg, check_ata, check_signer, check_writable,
        },
    },
    borsh::{BorshDeserialize},
    num_traits::pow,
    solana_program::{
        account_info::{next_account_info, AccountInfo},
        entrypoint::ProgramResult,
        msg,
        program::{invoke_signed},
        program_pack::Pack,
        pubkey::Pubkey,
    },
    spl_token::{state::Account as TokenAccount},
};

// TODO: store `count` parameter in subscription metadata (struct) and remove the paramter
pub fn process_withdraw(program_id: &Pubkey, accounts: &[AccountInfo], amount: u64, count: u64) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();

    let payer_ai = next_account_info(account_info_iter)?;
    let payer_token_account_ai = next_account_info(account_info_iter)?; // SPL token account
    let deposit_vault_ai = next_account_info(account_info_iter)?;
    let subscription_ai = next_account_info(account_info_iter)?;
    let token_program_ai = next_account_info(account_info_iter)?;

    check_signer(payer_ai);
    [payer_ai, payer_token_account_ai, deposit_vault_ai].iter().map(|x| check_writable(x));

    // Deserialize token account
    let deposit_vault = TokenAccount::unpack_from_slice(&deposit_vault_ai.try_borrow_data()?)?;
    let payer_token_account = TokenAccount::unpack_from_slice(&payer_token_account_ai.try_borrow_data()?)?;

    // Get subscription data
    let subscription = Subscription::try_from_slice(&subscription_ai.try_borrow_data()?)?;

    // Validations

    assert_msg(
        payer_token_account.owner == *payer_ai.key,
        SubscriptionError::InvalidVaultOwner.into(),
        "Invalid vault owner",
    )?;

    check_ata(
        deposit_vault_ai,
        subscription_ai.key,
        &subscription.deposit_mint,
    )?;

    // Check that caller is the rightful owner, ie. owner (payer) of the subscription 
    
    if let Some(current_mint) = subscription.mint {
        assert_msg(
            payer_token_account.mint == current_mint,
            SubscriptionError::InvalidSubscriptionOwner.into(),
            "Invalid subscription owner. Only the owner of a subscription associated with the deposit vault can withdraw.",
        )?;
    }

    assert_msg(
        payer_token_account.amount > (0.3f64 * pow(10u64, 9) as f64) as u64,
        SubscriptionError::InsufficientWithdrawBalance.into(),
        "Insufficient funds to withdraw.",
    )?;

    // Just ignore request if insufficient fund to withdraw
    if deposit_vault.amount < amount {
        msg!("Insufficient funds to withdraw.");
        return Ok(());
    }

    msg!("Transferring the requested fund to the owner...");

    let instruction = &spl_token::instruction::transfer(
        &spl_token::id(),
        deposit_vault_ai.key,
        payer_token_account_ai.key,
        payer_ai.key,
        &[],
        amount,
    )?;

    let withdrawal_seeds = &[
        b"subscription_withdrawal",
        deposit_vault_ai.key.as_ref(),
        payer_ai.key.as_ref(),
        &amount.to_le_bytes(),
        &count.to_le_bytes(),
    ];
    
    invoke_signed(
        instruction,
        &[
            deposit_vault_ai.clone(),
            payer_token_account_ai.clone(),
            subscription_ai.clone(),
        ],
        &[withdrawal_seeds],
    )?;

    Ok(())
}
