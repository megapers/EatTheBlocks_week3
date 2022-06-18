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
    });

    it('Deploys a wallet', () => {
        expect(wallet.address, 'Wallet is deployed').to.be.ok;
    });

    it('Should return correct approvers', async () => {
        const contractApprovers = await wallet.getApprovers();
        expect(approvers).to.be.deep.equal(contractApprovers);
    });

    it('Create Transfer - happy path', async () => {
        await wallet.connect(signers[0]).createTransfer(ethers.utils.parseEther('1'), approvers[1]);
        const transfers = await wallet.getTransfers();
        expect(ethers.utils.parseEther('1')).to.be.equal(transfers[0].amount);
        expect(transfers.length-1).to.be.equal(transfers[0].id);
        expect(approvers[1]).to.be.equal(transfers[0].to);
    });

    it('Create Transfer - unhappy path', async () => {
        const tx = wallet.connect(signers[4]).createTransfer(ethers.utils.parseEther('1'), approvers[1]);
        await expect(tx).to.be.revertedWith('only approver allowed');
    });

    
});