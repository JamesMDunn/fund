use anchor_lang::prelude::*;
use anchor_spl::token::{self, SetAuthority, Transfer, TokenAccount};

#[program]
pub mod fund {
    use super::*;

    pub fn initialize(
        ctx: Context<InitializeFund>,
        fund_goal: u64,
    ) -> ProgramResult {
        msg!("this is the owner {:?}", &ctx.accounts.initializer_deposit_token_account.owner);
        msg!("this is the balance {:?}", &ctx.accounts.initializer_deposit_token_account.owner);
        let fund_account = &mut ctx.accounts.fund_account;
        fund_account.fund_goal_amount = fund_goal;
        fund_account.authority = *ctx.accounts.authority.key;
        fund_account.current_amount = 0;
        Ok(())
    }

    pub fn donate_fund(ctx: Context<DonateFund>, amount: u64) -> ProgramResult {
        let fund_account = &mut ctx.accounts.fund_account;
        fund_account.current_amount += amount;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeFund<'info> {
    #[account(init)]
    pub fund_account: ProgramAccount<'info, Fund>,
    pub initializer_deposit_token_account: CpiAccount<'info, TokenAccount>,
    // pub initializer_receive_token_account: CpiAccount<'info, TokenAccount>,
    #[account(signer)]
    pub authority: AccountInfo<'info>,
    pub token_program: AccountInfo<'info>
}

#[derive(Accounts)]
pub struct DonateFund<'info> {
    #[account(mut)]
    pub fund_account: ProgramAccount<'info, Fund>,
}

#[account]
pub struct Fund {
    pub fund_goal_amount: u64,
    pub current_amount: u64,
    pub authority: Pubkey,
}

// #[account]
// #[derive(Default)]
// pub struct Contributor {
//     pub amount: u64,
//     pub address: Pubkey
// }
