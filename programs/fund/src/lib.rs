use anchor_lang::prelude::*;
use anchor_lang::{AnchorDeserialize, AnchorSerialize};
use anchor_spl::token::{self, SetAuthority, Token, TokenAccount, Transfer};
use spl_token::instruction::AuthorityType;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod fund {
    use super::*;

    const FUND_PDA_SEED: &[u8] = b"fund";

    pub fn initialize(
        ctx: Context<InitializeFund>,
        initializer_amount: u64,
        goal: u64,
    ) -> ProgramResult {
        let user = &mut ctx.accounts.user;
        let fund = &mut ctx.accounts.fund_account;

        fund.initializer_key = user.to_account_info().key();
        fund.initializer_token_account = ctx
            .accounts
            .initializer_token_account
            .to_account_info()
            .key();
        fund.initializer_amount = initializer_amount;
        fund.goal = goal;
        msg!("got here {}", ctx.accounts.fund_account.initializer_key);

        let (pda, bump_seed) = Pubkey::find_program_address(&[FUND_PDA_SEED], ctx.program_id);
        token::set_authority(ctx.accounts.into(), AuthorityType::AccountOwner, Some(pda))?;
        Ok(())
    }

    pub fn donate_fund(ctx: Context<Donate>, donator_amount: u64) -> ProgramResult {
        msg!("got to the donate");
        let donator = Donator {
            amount: donator_amount,
            key: ctx.accounts.user.key(),
            token_account: ctx.accounts.donator_token_account.key(),
        };
        let fund = &mut ctx.accounts.fund_account;
        fund.donators.push(donator);
        fund.amount_raised += donator_amount;
        // let (pda, bump_seed) = Pubkey::find_program_address(&[FUND_PDA_SEED], ctx.program_id);
        // token::set_authority(ctx.accounts.into(), AuthorityType::AccountOwner, Some(pda))?;
        let (pda, bump_seed) = Pubkey::find_program_address(&[FUND_PDA_SEED], ctx.program_id);
        let seeds = &[&FUND_PDA_SEED[..], &[bump_seed]];

        token::set_authority(
            ctx.accounts
                .into_set_authority_context()
                .with_signer(&[&seeds[..]]),
            AuthorityType::AccountOwner,
            Some(pda),
        )?;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeFund<'info> {
    #[account(mut)]
    pub initializer_token_account: Account<'info, TokenAccount>,
    #[account(init, payer = user, space = 8 + 84 + 32 + 32 + 8 + 8)]
    pub fund_account: Account<'info, FundAccount>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct Donate<'info> {
    #[account(mut)]
    pub initializer_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub donator_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub fund_account: Account<'info, FundAccount>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub pda_account: AccountInfo<'info>,
}

#[account]
#[derive(Default)]
pub struct FundAccount {
    pub initializer_amount: u64,
    pub donators: Vec<Donator>,
    pub initializer_key: Pubkey,
    pub initializer_token_account: Pubkey,
    pub amount_raised: u64,
    pub goal: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Debug, PartialEq, Eq, Clone, Copy)]
pub struct Donator {
    pub amount: u64,
    pub key: Pubkey,
    pub token_account: Pubkey,
}

impl<'info> From<&mut InitializeFund<'info>>
    for CpiContext<'_, '_, '_, 'info, SetAuthority<'info>>
{
    fn from(accounts: &mut InitializeFund<'info>) -> Self {
        let cpi_accounts = SetAuthority {
            account_or_mint: accounts.initializer_token_account.to_account_info(),
            current_authority: accounts.user.to_account_info(),
        };
        let cpi_program = accounts.token_program.to_account_info();
        CpiContext::new(cpi_program, cpi_accounts)
    }
}

impl<'info> Donate<'info> {
    fn into_set_authority_context(&self) -> CpiContext<'_, '_, '_, 'info, SetAuthority<'info>> {
        let cpi_accounts = SetAuthority {
            account_or_mint: self.donator_token_account.to_account_info().clone(),
            current_authority: self.user.to_account_info(),
        };
        let cpi_program = self.token_program.to_account_info();
        CpiContext::new(cpi_program, cpi_accounts)
    }
}

// impl<'info> From<&mut Donate<'info>> for CpiContext<'_, '_, '_, 'info, SetAuthority<'info>> {
//     fn from(accounts: &mut Donate<'info>) -> Self {
//         let cpi_accounts = SetAuthority {
//             account_or_mint: accounts.donator_token_account.to_account_info(),
//             current_authority: accounts.user.to_account_info(),
//         };
//         let cpi_program = accounts.token_program.to_account_info();
//         CpiContext::new(cpi_program, cpi_accounts)
//     }
// }
//
// impl<'info> Donate<'info> {
//     fn into_fund_transfer(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
//         let cpi_accounts = Transfer {
//             from: self.donator_token_account.to_account_info(),
//             to: self.pda_account.to_account_info(),
//             authority: self.pda_account.to_account_info(),
//         };
//         let cpi_program = self.token_program.to_account_info();
//         CpiContext::new(cpi_program, cpi_accounts)
//     }
// }
