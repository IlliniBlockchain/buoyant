use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    pubkey::Pubkey, 
    program_error::ProgramError,
    instruction::{AccountMeta, Instruction},
    system_program,
    sysvar,
};
use spl_associated_token_account;
use crate::utils::{program_id, get_counter_address, get_subscription_address};

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub enum SubscriptionInstruction {
    /// Initializes a new subscription.
    ///
    /// Creates new subscription metadata account, and a new associated
    /// token account as a vault for payments.
    ///
    /// Accounts expected by this instruction:
    ///
    ///   0. `[writable, signer]` user
    ///   1. `[writable]` (PDA) metadata counter
    ///   1. `[writable]` (PDA) subscription metadata
    ///   2. `[writable]` (PDA) deposit vault
    ///   3. `[]` (PDA) deposit vault mint
    ///   4. `[]` system program
    ///   5. `[]` sysvar rent
    ///   6. `[]` token program
    ///   7. `[]` associated token program
    ///
    Initialize {
        payee: Pubkey,
        amount: u64,
        duration: i64,
    },

    /// Wrapper on transfer function. Deposits token into deposit vault.
    ///
    /// Accounts expected by this instruction:
    ///
    ///   0. `[writable, signer]` payer
    ///   1. `[writable]` payer token account
    ///   2. `[writable]` deposit vault
    ///   3. `[]` token program for token transfers
    ///
    Deposit { amount: u64 },

    /// Wrapper on transfer function. Withdraws token from deposit vault
    /// as long as caller is rightful owner.
    ///
    /// Accounts expected by this instruction:
    ///
    ///   0. `[writable, signer]` payer
    ///   1. `[writable]` payer token account
    ///   2. `[writable]` deposit vault
    ///   3. `[]` subscription metadata
    ///   4. `[]` token program for token transfers
    ///
    Withdraw { amount: u64 },

    /// Renews or deactivates a provided subscription.
    ///
    /// Checks if the time is up for a renewal, and if not, reverts. Creates a new token mint
    /// and updates subscription metadata. If vault balance is high enough, it will transfer
    /// funds to payee specified by metadata, as well as a small fee to the caller of this
    /// function, and mint a new token to the payer for maintaining an active subscription.
    /// If the vault balance is not high enough, it will not transfer funds or mint a token.
    /// Also checks that the person to receive the new token is the current owner of the
    /// subscription. If subscription has yet to be initialized (no current mint), it won't
    /// perform this check.
    ///
    /// Accounts expected by this instruction:
    ///
    ///   0. `[writable, signer]` caller
    ///   1. `[writable]` (PDA) subscription metadata
    ///   1.5`[]` deposit mint - for ata creation
    ///   2. `[writable]` (PDA) deposit vault
    ///   2.5`[]` payee - for ata creation
    ///   3. `[writable]` (PDA) payee vault
    ///   4. `[writable]` (PDA) caller vault
    ///   5. `[writable]` (PDA) new token mint
    ///   6. `[writable]` (PDA) payer new token vault
    ///   7. `[]` (PDA) payer old token vault
    ///   8. `[]` payer - for ata creation
    ///   9. `[]` system program
    ///   10. `[]` sysvar rent program
    ///   11. `[]` token program
    ///   12. `[]` associated token program
    ///
    Renew { count: u64 },

    /// Withdraws rent from subscription metadata. Can only be called by account that
    /// initialized the subscription.
    ///
    /// Accounts expected by this instruction:
    ///
    ///   0. `[writable, signer]` user
    ///   1. `[writable]` subscription metadata
    ///   2. `[]` system program
    ///
    Close {},
}

// INSTRUCTION WRAPPERS

pub fn initialize_raw(
    program_pubkey: &Pubkey,
    user_pubkey: &Pubkey,
    counter_pubkey: &Pubkey,
    subscription_pubkey: &Pubkey,
    vault_pubkey: &Pubkey,
    vault_mint_pubkey: &Pubkey,
    payee: &Pubkey,
    amount: u64,
    duration: i64,
) -> Instruction {

    let data = SubscriptionInstruction::Initialize {
        payee: *payee,
        amount,
        duration
    };

    let accounts = vec![
        AccountMeta::new(*user_pubkey, true),
        AccountMeta::new(*counter_pubkey, false),
        AccountMeta::new(*subscription_pubkey, false),
        AccountMeta::new(*vault_pubkey, false),
        AccountMeta::new_readonly(*vault_mint_pubkey, false),
        AccountMeta::new_readonly(system_program::id(), false),
        AccountMeta::new_readonly(sysvar::rent::id(), false),
        AccountMeta::new_readonly(spl_token::id(), false),
        AccountMeta::new_readonly(spl_associated_token_account::id(), false),
    ];

    Instruction {
        program_id: *program_pubkey,
        accounts,
        data: data.try_to_vec().unwrap(),
    }
}

pub fn initialize(
    user_pubkey: &Pubkey,
    deposit_mint: &Pubkey,
    payee: &Pubkey,
    amount: u64,
    duration: i64,
    count: u64,
) -> Instruction {
    let (counter, _) = get_counter_address(payee, amount, duration);
    let (subscription, _) = get_subscription_address(payee, amount, duration, count);
    let deposit_vault =
        spl_associated_token_account::get_associated_token_address(&subscription, &deposit_mint);

    initialize_raw(
        &program_id(),
        user_pubkey,
        &counter,
        &subscription,
        &deposit_vault,
        deposit_mint,
        payee,
        amount,
        duration,
    )
}

/// Creates a `Withdraw` instruction.
pub fn withdraw(
    program_pubkey: &Pubkey,
    payer_pubkey: &Pubkey,
    destination_pubkey: &Pubkey,
    vault_pubkey: &Pubkey,
    subscription_pubkey: &Pubkey,
    token_program_id: &Pubkey,
    amount: u64
) -> Result<Instruction, ProgramError> {

    let data = SubscriptionInstruction::Withdraw {
        amount
    };

    let accounts = vec![
        AccountMeta::new(*payer_pubkey, true),
        AccountMeta::new(*destination_pubkey, false),
        AccountMeta::new(*vault_pubkey, false),
        AccountMeta::new_readonly(*subscription_pubkey, false),
        AccountMeta::new_readonly(*token_program_id, false),
    ];

    Ok(Instruction {
        program_id: *program_pubkey,
        accounts,
        data: data.try_to_vec().unwrap(),
    })
}