const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('Wallet', async () => {
    let wallet;
    let signers;
    let approvers = [];

    beforeEach(async () => {
        signers = await ethers.getSigners();

        for (let i = 0; i < 3; i++) {
            approvers[i] = signers[i].address;
        }

        const Wallet = await ethers.getContractFactory('Wallet');
        wallet = await Wallet.deploy(approvers, 2);
        await wallet.deployed();

        //Send ether to the wallet
        await signers[5].sendTransaction({
            to: wallet.address,
            value: ethers.utils.parseEther("20")
        });
    });

    it('Deploys a wallet', () => {
        expect(wallet.address, 'Wallet is deployed').to.be.ok;
    });

    it('Check wallet ballance', async () => {
        const walletBalance = await wallet.provider.getBalance(wallet.address)
        expect(ethers.utils.parseEther("20")).to.be.equal(walletBalance);    
    });

    it('Should return correct approvers', async () => {
        const contractApprovers = await wallet.getApprovers();
        expect(approvers).to.be.deep.equal(contractApprovers);
    });

    it('Create Transfer - happy path', async () => {
        await wallet.connect(signers[0]).createTransfer(ethers.utils.parseEther('1'), approvers[1]);
        const transfers = await wallet.getTransfers();
        expect(ethers.utils.parseEther('1')).to.be.equal(transfers[0].amount);
        expect(transfers.length - 1).to.be.equal(transfers[0].id);
        expect(approvers[1]).to.be.equal(transfers[0].to);
    });

    it('Create Transfer - unhappy path', async () => {
        const tx = wallet.connect(signers[4]).createTransfer(ethers.utils.parseEther('1'), approvers[1]);
        await expect(tx).to.be.revertedWith('only approver allowed');
    });

    it('Approve transfer', async () => {
        const amountToSend = ethers.utils.parseEther("10");
        await wallet.connect(signers[0]).createTransfer(ethers.utils.parseEther("10"), approvers[2]);

        const balanceBefore = await signers[2].getBalance();
        const walletBalanceBefore = await wallet.provider.getBalance(wallet.address)

        await wallet.connect(signers[0]).approveTransfer(0);
        await wallet.connect(signers[1]).approveTransfer(0);

        const balanceAfter = await signers[2].getBalance();
        const expectedBalance = balanceBefore.add(ethers.BigNumber.from(amountToSend));
        expect(expectedBalance).to.be.equal(balanceAfter);
        
        const walletBalanceAfter = await wallet.provider.getBalance(wallet.address)
        const expectedWalletBlance = walletBalanceBefore.sub(ethers.BigNumber.from(amountToSend));
        expect(expectedWalletBlance).to.be.equal(walletBalanceAfter);

        const transfers = await wallet.getTransfers();
        expect(2).to.be.equal(transfers[0].approvals);
        expect(true).to.be.equal(transfers[0].sent);

        const tx = wallet.connect(signers[0]).approveTransfer(0);
        await expect(tx).to.be.revertedWith("transfer has already been sent");
    });

});