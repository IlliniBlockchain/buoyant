use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    instruction::{AccountMeta, Instruction},
    program_error::ProgramError,
    pubkey::Pubkey,
    system_program, sysvar,
};
use spl_associated_token_account;

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

    /// Initiates a new active subscription.
    ///
    /// Initializes metadata account, initializes deposit vault,
    /// initializes NFT mint, mints first and only NFT to caller,
    /// freezes mint, initializes counter (if very first subscription),
    /// increments counter (if new subscription).
    ///
    /// Makes first token transfer to payee and sets subscription to active,
    /// deposits starting amount into deposit vault. Starting amount must be at
    /// least as great as typical fee in order to compensate callers upon expiration
    /// without withdrawing rent.
    ///
    /// Can be called on previously closed subscriptions, or brand new subscriptions.
    ///
    /// Accounts expected by this instruction:
    ///
    ///   0. `[writable, signer]` user
    ///   1. `[writable]` user deposit token account
    ///   2. `[writable]` (PDA) user subscription ownership token account
    ///   3. `[]` payee - for ata creation
    ///   4. `[writable]` (PDA) payee deposit token account
    ///   5. `[writable]` (PDA) subscription metadata
    ///   6. `[writable]` (PDA) subscription counter
    ///   7. `[writable]` (PDA) subscription ownership token mint
    ///   8. `[writable]` (PDA) deposit vault
    ///   9. `[]` (PDA) deposit vault mint
    ///   10. `[]` system program
    ///   11. `[]` sysvar rent
    ///   12. `[]` token program
    ///   13. `[]` associated token program
    ///
    Initialize2 {
        payee: Pubkey,
        amount: u64,
        duration: i64,
        start_amount: u64,
    },

    /// Renews or deactivates a provided subscriptions.
    ///
    /// Same cases as previous instruction for renew versus expire.
    /// If time is up and sufficient funds (`subscription.amount`) are present,
    /// mark active and transfer funds to caller and payee. If time is up and
    /// deposit vault has insufficient funds, mark inactive and transfer fee
    /// to caller. Creates token accounts when necessary.
    ///
    /// No longer creates new mint upon renewal. No longer closes accounts or
    /// withdraws rent upon expiry.
    ///
    /// Accounts expected by this instruction:
    ///
    ///   0. `[writable, signer]` caller
    ///   1. `[writable]` (PDA) caller deposit token account
    ///   2. `[]` payee - for ata creation
    ///   3. `[writable]` (PDA) payee deposit token account
    ///   4. `[writable]` (PDA) subscription metadata
    ///   5. `[writable]` (PDA) deposit vault
    ///   6. `[]` (PDA) deposit vault mint
    ///   7. `[]` system program
    ///   8. `[]` sysvar rent program
    ///   9. `[]` token program
    ///   10. `[]` associated token program
    ///
    Renew2 { count: u64 },

    /// Closes a subscription and associated accounts.
    ///
    /// Zeroes out subscription data and withdraws rent. Closes
    /// deposit vault and withdraws all funds. Only callable by
    /// owner. Creates caller's token account to withdraw funds
    /// if necessary.
    ///
    /// Accounts expected by this instruction:
    ///
    ///   0. `[writable, signer]` user
    ///   1. `[writable] user deposit/withdraw token account
    ///   2. `[]` user subscription ownership token account
    ///   3. `[writable]` subscription metadata
    ///   4. `[writable]` deposit vault
    ///   5. `[]` deposit mint - for ata creation
    ///   6. `[]` system program
    ///   7. `[]` sysvar rent program
    ///   8. `[]` token program
    ///   9. `[]` associated token program
    ///
    Close {},
}

// INSTRUCTION WRAPPERS

/// Creates an `Initialize` instruction
pub fn initialize(
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
        duration,
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

/// Creates a `Withdraw` instruction.
pub fn withdraw(
    program_pubkey: &Pubkey,
    payer_pubkey: &Pubkey,
    destination_pubkey: &Pubkey,
    vault_pubkey: &Pubkey,
    subscription_pubkey: &Pubkey,
    token_program_id: &Pubkey,
    amount: u64,
) -> Result<Instruction, ProgramError> {
    let data = SubscriptionInstruction::Withdraw { amount };

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

/// Creates an `Initialize2` instruction
pub fn initialize2(
    program_id: &Pubkey,
    user: &Pubkey,
    user_deposit_account: &Pubkey,
    user_subscription_token_account: &Pubkey,
    payee: &Pubkey,
    payee_deposit_account: &Pubkey,
    subscription: &Pubkey,
    subscription_counter: &Pubkey,
    subscription_mint: &Pubkey,
    deposit_vault: &Pubkey,
    deposit_mint: &Pubkey,
    amount: u64,
    duration: i64,
    start_amount: u64,
) -> Instruction {
    let data = SubscriptionInstruction::Initialize2 {
        payee: *payee,
        amount,
        duration,
        start_amount,
    };

    let accounts = vec![
        AccountMeta::new(*user, true),
        AccountMeta::new(*user_deposit_account, false),
        AccountMeta::new(*user_subscription_token_account, false),
        AccountMeta::new_readonly(*payee, false),
        AccountMeta::new(*payee_deposit_account, false),
        AccountMeta::new(*subscription, false),
        AccountMeta::new(*subscription_counter, false),
        AccountMeta::new(*subscription_mint, false),
        AccountMeta::new(*deposit_vault, false),
        AccountMeta::new_readonly(*deposit_mint, false),
        AccountMeta::new_readonly(system_program::id(), false),
        AccountMeta::new_readonly(sysvar::rent::id(), false),
        AccountMeta::new_readonly(spl_token::id(), false),
        AccountMeta::new_readonly(spl_associated_token_account::id(), false),
    ];

    Instruction {
        program_id: *program_id,
        accounts,
        data: data.try_to_vec().unwrap(),
    }
}

///   0. `[writable, signer]` caller
///   1. `[writable]` (PDA) caller deposit token account
///   2. `[]` payee - for ata creation
///   3. `[writable]` (PDA) payee deposit token account
///   4. `[writable]` (PDA) subscription metadata
///   5. `[writable]` (PDA) deposit vault
///   6. `[]` (PDA) deposit vault mint
///   7. `[]` system program
///   8. `[]` sysvar rent program
///   9. `[]` token program
///   10. `[]` associated token program
///

/// Creates an `Renew2` instruction
pub fn renew2(
    program_id: &Pubkey,
    caller: &Pubkey,
    caller_deposit_account: &Pubkey,
    payee: &Pubkey,
    payee_deposit_account: &Pubkey,
    subscription: &Pubkey,
    deposit_vault: &Pubkey,
    deposit_mint: &Pubkey,
) -> Instruction {

    let data = SubscriptionInstruction::Renew2 {};

    let accounts = vec![
        AccountMeta::new(*caller, true),
        AccountMeta::new(*caller_deposit_account, false),
        AccountMeta::new_readonly(*payee, false),
        AccountMeta::new(*payee_deposit_account, false),
        AccountMeta::new(*subscription, false),
        AccountMeta::new(*deposit_vault, false),
        AccountMeta::new_readonly(*deposit_mint, false),
        AccountMeta::new_readonly(system_program::id(), false),
        AccountMeta::new_readonly(sysvar::rent::id(), false),
        AccountMeta::new_readonly(spl_token::id(), false),
        AccountMeta::new_readonly(spl_associated_token_account::id(), false),
    ];

    Instruction {
        program_id: *program_id,
        accounts,
        data: data.try_to_vec().unwrap(),
    }
}
