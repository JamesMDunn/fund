const anchor = require('@project-serum/anchor');
const {Wallet} = require('@project-serum/anchor');
const {TOKEN_PROGRAM_ID, Token} = require("@solana/spl-token");
const assert = require("assert")

describe('fund', () => {
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

    it('initialize state', async () => {
        await provider.connection.confirmTransaction(
            await provider.connection.requestAirdrop(payer.publicKey, 10000000000)
        )

        mintA = await Token.createMint(
            provider.connection,
            payer,
            mintAuthority.publicKey,
            null,
            0,
            TOKEN_PROGRAM_ID
        )
        initializerTokenAccountA = await mintA.createAccount(provider.wallet.publicKey);
        await mintA.mintTo(
            initializerTokenAccountA,
            mintAuthority.publicKey,
            [mintAuthority],
            initializerAmount,
        )

        let tokenAccountInfo = await mintA.getAccountInfo(initializerTokenAccountA)

        assert.ok(tokenAccountInfo.amount.toString() === initializerAmount.toString());
        assert.ok(tokenAccountInfo.owner.equals(provider.wallet.publicKey))
    });

    it('initializes fund', async () => {
        const program = anchor.workspace.Fund;
        const tx = await program.rpc.initialize(new anchor.BN(initializerAmount), {
            accounts: {
                fundAccount: fundAccount.publicKey,
                initializerTokenAccount: initializerTokenAccountA,
                user: provider.wallet.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId,
                tokenProgram: TOKEN_PROGRAM_ID,
                rent: anchor.web3.SYSVAR_RENT_PUBKEY,
            },
            signers: [fundAccount]
        });

        const [tempPda, nonce] = await anchor.web3.PublicKey.findProgramAddress(
            [Buffer.from(anchor.utils.bytes.utf8.encode("fund"))],
            program.programId
        )
        pda = tempPda;


        let tokenAccount = await mintA.getAccountInfo(initializerTokenAccountA);
        let fund = await program.account.fundAccount.fetch(fundAccount.publicKey);
        assert.ok(tokenAccount.owner.equals(pda));
        assert.ok(fund.initializerKey.equals(provider.wallet.publicKey))
        assert.ok(fund.initializerTokenAccount.equals(initializerTokenAccountA))
        assert.ok(fund.initializerAmount.toNumber() === initializerAmount)
    })

});
