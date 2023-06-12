const { network, getNamedAccounts, deployments, ethers } = require('hardhat');
const { developmentChains } = require('../../helper-hardhat-config');
const { assert } = require('chai');

!developmentChains.includes(network.name)
  ? describe.skip
  : describe('BasicNft', () => {
      beforeEach(async () => {
        deployer = (await getNamedAccounts()).deployer;
        await deployments.fixture(['all']);
        basicNft = await ethers.getContract('BasicNft', deployer);
      });

      // constructor testing
      describe('constructor', () => {
        it('init the contract properly', async () => {
          const name = await basicNft.name();
          const symbol = await basicNft.symbol();
          const tokenCounter = await basicNft.getTokenCounter();
          assert.equal(name, 'Doggie');
          assert.equal(symbol, 'DOG');
          assert.equal(tokenCounter.toString(), '0');
        });
      });

      // MINT NFT
      describe('mint', () => {
        beforeEach(async () => {
          const txRes = await basicNft.mintNft();
          await txRes.wait(1);
        });
        it('allow user to mint and update properly', async () => {
          const tokenURI = await basicNft.tokenURI(0);
          const tokenCounter = await basicNft.getTokenCounter();

          assert.equal(tokenURI, await basicNft.TOKEN_URI());
          assert.equal(tokenCounter.toString(), '1');
        });
        it('show the correct balance and owner of an NFT', async () => {
          const deployerAddress = deployer;
          const deployerBalance = await basicNft.balanceOf(deployerAddress);
          const owner = await basicNft.ownerOf('0');

          assert.equal(deployerBalance.toString(), '1');
          assert.equal(owner, deployerAddress);
        });
      });
    });
