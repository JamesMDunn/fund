const anchor = require("@project-serum/anchor");
// const expect = require('jest');
const { TOKEN_PROGRAM_ID, Token } = require("@solana/spl-token");

describe("fund", () => {
  const provider = anchor.Provider.local();
  // Configure the client to use the local cluster.
  anchor.setProvider(provider);

  const program = anchor.workspace.Fund;

  let owner = provider.wallet.publicKey;

  // console.log("this is owner", owner)

  const fundAccount = anchor.web3.Keypair.generate();
  const payer = anchor.web3.Keypair.generate();
  const mint = new anchor.web3.PublicKey(
    "So11111111111111111111111111111111111111112"
  );
  const newMintAccount = anchor.web3.Keypair.generate();

  let wrappedTokenAccount = null;
  it("Is initialized state!", async () => {
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(owner, 10000000000),
      "confirmed"
    );
    console.log(await provider.connection.getBalance(owner));
    // const tx = new anchor.web3.Transaction();
    wrappedTokenAccount = await Token.createWrappedNativeAccount(
      provider.connection,
      TOKEN_PROGRAM_ID,
      owner,
      provider.wallet.payer,
      new anchor.BN(20)
    );
    console.log(wrappedTokenAccount);
    console.log(await provider.connection.getBalance(owner));
    expect(wrappedTokenAccount).toBeTruthy();
  });

  it("initialized escrow", async () => {
    // Add your test here.
    const fundAmount = new anchor.BN(20);
    await program.rpc.initialize(fundAmount, {
      accounts: {
        initializerDepositTokenAccount: wrappedTokenAccount,
        fundAccount: fundAccount.publicKey,
        authority: provider.wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      },
      instructions: [await program.account.fund.createInstruction(fundAccount)],
      signers: [fundAccount],
    });
    let fund = await program.account.fund.fetch(fundAccount.publicKey);
    console.log(fund);

    expect(fund.fundGoalAmount.toNumber()).toEqual(20);
    expect(fund.authority.equals(provider.wallet.publicKey)).toEqual(true);
  });

  xit("Is donates to the fund!", async () => {
    const addAmount = new anchor.BN(21);
    await program.rpc.donateFund(addAmount, {
      accounts: {
        fundAccount: fundAccount.publicKey,
      },
    });
    let fund = await program.account.fund.fetch(fundAccount.publicKey);

    assert.equal(fund.currentAmount, 21);
    assert.ok(fund.authority.equals(provider.wallet.publicKey));
  });
});
