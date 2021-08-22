const anchor = require('@project-serum/anchor');
const assert = require('assert');

describe('fund', () => {
  const provider = anchor.Provider.local();
  // Configure the client to use the local cluster.
  anchor.setProvider(provider);

  const program = anchor.workspace.Fund;
  // console.log(program)
  // Fund account.
  const fundAccount = anchor.web3.Keypair.generate();
  // const myAccount = 
  // console.log(provider.wallet.payer)

  it('Is initialized!', async () => {
    // Add your test here.
      const fundAmount = new anchor.BN(20)
      await program.rpc.initialize(fundAmount, {
      accounts: {
        fundAccount: fundAccount.publicKey,
        authority: provider.wallet.publicKey
      },
      
      instructions: [
        await program.account.fund.createInstruction(fundAccount),
      ],
      signers: [fundAccount],
    });
    let fund = await program.account.fund.fetch(fundAccount.publicKey)

    console.log(fund.fundGoalAmount.toNumber())
    assert.equal(fund.fundGoalAmount, 20)
    assert.ok(fund.authority.equals(provider.wallet.publicKey))
  });

  it('Is donates to the fund!', async () => {
      const addAmount = new anchor.BN(21)
      await program.rpc.donateFund(addAmount, {
      accounts: {
        fundAccount: fundAccount.publicKey,
      },
    });
    let fund = await program.account.fund.fetch(fundAccount.publicKey)

    assert.equal(fund.currentAmount, 21)
    assert.ok(fund.authority.equals(provider.wallet.publicKey))
  });
});
