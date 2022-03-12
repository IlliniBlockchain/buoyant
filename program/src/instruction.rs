use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::pubkey::Pubkey;

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
    ///
    /// Accounts expected by this instruction:
    ///
    ///   0. `[writable, signer]` caller
    ///   1. `[writable]` (PDA) subscription metadata
    ///   2. `[writable]` (PDA) deposit vault
    ///   3. `[writable]` (PDA) payee vault
    ///   4. `[writable]` (PDA) caller vault
    ///   5. `[writable]` (PDA) new token mint
    ///   6. `[writable]` (PDA) payer token vault
    ///   7. `[]` system program
    ///   8. `[]` sysvar rent program
    ///   9. `[]` token program
    ///   10. `[]` associated token program
    ///
    Renew {},

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
