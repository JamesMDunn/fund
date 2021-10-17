const anchor = require("@project-serum/anchor");
const { Wallet } = require("@project-serum/anchor");
const { TOKEN_PROGRAM_ID, Token } = require("@solana/spl-token");
const assert = require("assert");

describe("fund", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.Provider.env());
  let mintA = null;
  let initializerTokenAccountA = null;

  let donatorsTokenAccountA = null;
  let fundAccount = anchor.web3.Keypair.generate();
  const payer = anchor.web3.Keypair.generate();
  const mintAuthority = anchor.web3.Keypair.generate();
  const provider = anchor.getProvider();
  let pda = null;
  const initializerAmount = 100;
  const donaterAmount = 150;
  const goal = 1000;

  it("initialize state", async () => {
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(payer.publicKey, 10000000000)
    );

    mintA = await Token.createMint(
      provider.connection,
      payer,
      mintAuthority.publicKey,
      null,
      0,
      TOKEN_PROGRAM_ID
    );
    initializerTokenAccountA = await mintA.createAccount(
      provider.wallet.publicKey
    );
    donatorsTokenAccountA = await mintA.createAccount(
      provider.wallet.publicKey
    );

    await mintA.mintTo(
      initializerTokenAccountA,
      mintAuthority.publicKey,
      [mintAuthority],
      initializerAmount
    );

    await mintA.mintTo(
      donatorsTokenAccountA,
      mintAuthority.publicKey,
      [mintAuthority],
      donaterAmount
    );

    let intialTokenAccountInfo = await mintA.getAccountInfo(
      initializerTokenAccountA
    );
    let donatorTokenAccount = await mintA.getAccountInfo(donatorsTokenAccountA);

    assert.ok(intialTokenAccountInfo.amount.toNumber() === initializerAmount);
    assert.ok(intialTokenAccountInfo.owner.equals(provider.wallet.publicKey));
    assert.ok(donatorTokenAccount.owner.equals(provider.wallet.publicKey));
    assert.ok(donatorTokenAccount.amount.toNumber() === donaterAmount);
  });

  it("initializes fund", async () => {
    const program = anchor.workspace.Fund;
    const tx = await program.rpc.initialize(
      new anchor.BN(initializerAmount),
      new anchor.BN(goal),
      {
        accounts: {
          fundAccount: fundAccount.publicKey,
          initializerTokenAccount: initializerTokenAccountA,
          user: provider.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        },
        signers: [fundAccount],
      }
    );

    const [tempPda, nonce] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from(anchor.utils.bytes.utf8.encode("fund"))],
      program.programId
    );
    pda = tempPda;

    let tokenAccount = await mintA.getAccountInfo(initializerTokenAccountA);
    let fund = await program.account.fundAccount.fetch(fundAccount.publicKey);
    assert.ok(tokenAccount.owner.equals(pda));
    assert.ok(fund.initializerKey.equals(provider.wallet.publicKey));
    assert.ok(fund.initializerTokenAccount.equals(initializerTokenAccountA));
    assert.ok(fund.initializerAmount.toNumber() === initializerAmount);
    assert.ok(fund.goal.toNumber() === goal);
  });

  it("donates to the fund", async () => {
    const program = anchor.workspace.Fund;

    const tx = await program.rpc.donateFund(new anchor.BN(donaterAmount), {
      accounts: {
        pdaAccount: pda,
        initializerTokenAccount: initializerTokenAccountA,
        fundAccount: fundAccount.publicKey,
        donatorTokenAccount: donatorsTokenAccountA,
        user: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      },
    });

    let fund = await program.account.fundAccount.fetch(fundAccount.publicKey);
    let tokenAccount = await mintA.getAccountInfo(
      fund.donators[0].tokenAccount
    );
    let initializerTokenAcc = await mintA.getAccountInfo(
      fund.initializerTokenAccount
    );
    assert.ok(fund.donators[0].key.equals(provider.wallet.publicKey));
    assert.ok(fund.amountRaised.toNumber() === donaterAmount);
    assert.ok(tokenAccount.amount.toNumber() === 0);
    assert.ok(
      initializerTokenAcc.amount.toNumber() ===
        initializerAmount + donaterAmount
    );
    assert.ok(tokenAccount.owner.equals(pda));
  });

  it("initializer withdraw only when goal amount has reached", async () => {
    const program = anchor.workspace.Fund;
    await mintA.mintTo(
      donatorsTokenAccountA,
      mintAuthority.publicKey,
      [mintAuthority],
      goal
    );

    const tx1 = await program.rpc.donateFund(new anchor.BN(goal), {
      accounts: {
        pdaAccount: pda,
        initializerTokenAccount: initializerTokenAccountA,
        fundAccount: fundAccount.publicKey,
        donatorTokenAccount: donatorsTokenAccountA,
        user: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      },
    });

    const fund1 = await program.account.fundAccount.fetch(
      fundAccount.publicKey
    );

    assert.ok(fund1.amountRaised.toNumber() >= fund1.goal);
    assert.ok(fund1.donators[0].amount.toNumber() >= fund1.goal);

    const tx2 = await program.rpc.initializerWithdraw({
      accounts: {
        pdaAccount: pda,
        initializerTokenAccount: initializerTokenAccountA,
        fundAccount: fundAccount.publicKey,
        user: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      },
    });

    const fund2 = await program.account.fundAccount.fetch(
      fundAccount.publicKey
    );

    let initializer = await mintA.getAccountInfo(initializerTokenAccountA);

    assert.ok(initializer.amount.toNumber() >= goal);
    assert.ok(initializer.owner.equals(provider.wallet.publicKey));
  });
});

describe("fund2", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.Provider.env());
  let mintA = null;
  let initializerTokenAccountA = null;

  let donatorsTokenAccountA = null;
  let fundAccount = anchor.web3.Keypair.generate();
  const payer = anchor.web3.Keypair.generate();
  const mintAuthority = anchor.web3.Keypair.generate();
  const provider = anchor.getProvider();
  let pda = null;
  const initializerAmount = 100;
  const donaterAmount = 150;
  const goal = 1000;

  it("initialize state", async () => {
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(payer.publicKey, 10000000000)
    );

    mintA = await Token.createMint(
      provider.connection,
      payer,
      mintAuthority.publicKey,
      null,
      0,
      TOKEN_PROGRAM_ID
    );
    initializerTokenAccountA = await mintA.createAccount(
      provider.wallet.publicKey
    );
    donatorsTokenAccountA = await mintA.createAccount(
      provider.wallet.publicKey
    );

    await mintA.mintTo(
      initializerTokenAccountA,
      mintAuthority.publicKey,
      [mintAuthority],
      initializerAmount
    );

    await mintA.mintTo(
      donatorsTokenAccountA,
      mintAuthority.publicKey,
      [mintAuthority],
      donaterAmount
    );

    let intialTokenAccountInfo = await mintA.getAccountInfo(
      initializerTokenAccountA
    );
    let donatorTokenAccount = await mintA.getAccountInfo(donatorsTokenAccountA);

    assert.ok(intialTokenAccountInfo.amount.toNumber() === initializerAmount);
    assert.ok(intialTokenAccountInfo.owner.equals(provider.wallet.publicKey));
    assert.ok(donatorTokenAccount.owner.equals(provider.wallet.publicKey));
    assert.ok(donatorTokenAccount.amount.toNumber() === donaterAmount);
  });

  it("initializes fund and donates", async () => {
    const program = anchor.workspace.Fund;
    const tx = await program.rpc.initialize(
      new anchor.BN(initializerAmount),
      new anchor.BN(goal),
      {
        accounts: {
          fundAccount: fundAccount.publicKey,
          initializerTokenAccount: initializerTokenAccountA,
          user: provider.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        },
        signers: [fundAccount],
      }
    );

    const [tempPda, nonce] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from(anchor.utils.bytes.utf8.encode("fund"))],
      program.programId
    );
    pda = tempPda;

    let tokenAccount = await mintA.getAccountInfo(initializerTokenAccountA);
    let fund = await program.account.fundAccount.fetch(fundAccount.publicKey);

    assert.ok(tokenAccount.owner.equals(pda));
    assert.ok(fund.initializerKey.equals(provider.wallet.publicKey));
    assert.ok(fund.initializerTokenAccount.equals(initializerTokenAccountA));
    assert.ok(fund.initializerAmount.toNumber() === initializerAmount);
    assert.ok(fund.goal.toNumber() === goal);

    const tx2 = await program.rpc.donateFund(new anchor.BN(donaterAmount), {
      accounts: {
        pdaAccount: pda,
        initializerTokenAccount: initializerTokenAccountA,
        fundAccount: fundAccount.publicKey,
        donatorTokenAccount: donatorsTokenAccountA,
        user: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      },
    });

    let fund2 = await program.account.fundAccount.fetch(fundAccount.publicKey);
    let tokenAccount2 = await mintA.getAccountInfo(
      fund2.donators[0].tokenAccount
    );
    let initializerTokenAcc = await mintA.getAccountInfo(
      fund2.initializerTokenAccount
    );

    assert.ok(fund2.donators[0].key.equals(provider.wallet.publicKey));
    assert.ok(fund2.amountRaised.toNumber() === donaterAmount);
    assert.ok(tokenAccount2.amount.toNumber() === 0);
    assert.ok(
      initializerTokenAcc.amount.toNumber() ===
        initializerAmount + donaterAmount
    );
    assert.ok(tokenAccount2.owner.equals(pda));
  });

  it("donor withdraw ", async () => {
    const program = anchor.workspace.Fund;
    const tx1 = await program.rpc.donorWithdraw({
      accounts: {
        pdaAccount: pda,
        initializerTokenAccount: initializerTokenAccountA,
        fundAccount: fundAccount.publicKey,
        donatorTokenAccount: donatorsTokenAccountA,
        user: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      },
    });

    const fund = await program.account.fundAccount.fetch(fundAccount.publicKey);

    let donatorTokenAcc = await mintA.getAccountInfo(donatorsTokenAccountA);
    assert.ok(donatorTokenAcc.owner.equals(provider.wallet.publicKey));
    assert.ok(donatorTokenAcc.amount.toNumber() === donaterAmount);
  });
});
