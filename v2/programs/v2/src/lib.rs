use anchor_lang::prelude::*;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod v2 {
    use super::*;
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        Ok(())
    }
    pub fn withdraw(ctx: Context<Withdraw>) -> Result<()> {
        Ok(())
    }
    pub fn renew(ctx: Context<Renew>) -> Result<()> {
        Ok(())
    }
    pub fn register(ctx: Context<Register>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {

}

#[derive(Accounts)]
pub struct Withdraw {}

#[derive(Accounts)]
pub struct Renew {}

#[derive(Accounts)]
pub struct Register {}

#[account]
#[derive(Default)]
pub struct Subscription {
    pub active: bool,

    pub mint: Option<Pubkey>,
    pub deposit_vault: Pubkey,
    pub deposit_mint: Pubkey,

    pub payee: Pubkey,
    pub amount: u64,
    pub duration: i64, // = UnixTimestamp, although will always be positive

    pub next_renew_time: i64,
    pub renewal_count: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Debug, Clone)]
pub struct Counter {
    pub count: u64,
}