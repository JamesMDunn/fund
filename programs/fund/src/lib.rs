use anchor_lang::prelude::*;
use anchor_spl::token::{self, SetAuthority, TokenAccount, Token};
use spl_token::instruction::AuthorityType;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod fund {
    use super::*;

    const FUND_PDA_SEED: &[u8] = b"fund";

    pub fn initialize(ctx: Context<InitializeFund>, initializer_amount: u64) -> ProgramResult {
        let user = &mut ctx.accounts.user;
        ctx.accounts.fund_account.initializer_key = user.to_account_info().key();
        ctx.accounts.fund_account.initializer_token_account = ctx.accounts.initializer_token_account.to_account_info().key();
        ctx.accounts.fund_account.initializer_amount = initializer_amount;
        msg!("got here {}", ctx.accounts.fund_account.initializer_key);

        let (pda, bump_seed) = Pubkey::find_program_address(&[FUND_PDA_SEED], ctx.program_id);
        token::set_authority(ctx.accounts.into(), AuthorityType::AccountOwner, Some(pda))?;
        Ok(())
    }

    // pub fn update(ctx: Context<Donate>) -> ProgramResult {
    //
    //     Ok(())
    // }
}

#[derive(Accounts)]
pub struct InitializeFund<'info> {
    #[account(mut)]
    pub initializer_token_account: Account<'info, TokenAccount>,
    #[account(init, payer = user)]
    pub fund_account: Account<'info, FundAccount>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>
}

// #[derive(Accounts)]
// pub struct Donate<'info> {
//     #[account(mut, payer = user)]
//     pub donator_account: Account<'info, InitializerAccount>,
//     pub donator_token_account: Account<'info, TokenAccount>,
// }


#[account]
#[derive(Default)]
pub struct FundAccount {
    pub initializer_amount: u64,
    pub data: Vec<Pubkey>,
    pub initializer_key: Pubkey,
    pub initializer_token_account: Pubkey,
}

impl<'info> From<&mut InitializeFund<'info>>
for CpiContext<'_, '_, '_, 'info, SetAuthority<'info>>
{
    fn from(accounts: &mut InitializeFund<'info>) -> Self {
        let cpi_accounts = SetAuthority {
            account_or_mint: accounts
                .initializer_token_account
                .to_account_info().clone(),
            current_authority: accounts.user.to_account_info().clone(),
        };
        let cpi_program = accounts.token_program.to_account_info().clone();
        CpiContext::new(cpi_program, cpi_accounts)
    }
}