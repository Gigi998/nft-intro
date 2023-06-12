const { network, getNamedAccounts, deployments, ethers } = require('hardhat');
const { developmentChains, networkConfig } = require('../../helper-hardhat-config');
const { assert, expect } = require('chai');

!developmentChains.includes(network.name)
  ? describe.skip
  : describe('RandomIpfsNft Test', () => {
      let randomIpfsNft, vrfCoordinatorV2Mock, mintFee, moddedRng;

      beforeEach(async () => {
        deployer = (await getNamedAccounts()).deployer;
        await deployments.fixture(['all']);
        randomIpfsNft = await ethers.getContract('RandomIpfsNft', deployer);
        vrfCoordinatorV2Mock = await ethers.getContract('VRFCoordinatorV2Mock', deployer);
        mintFee = await randomIpfsNft.getMintFee();
      });

      // constructor testing
      describe('constructor', () => {
        it('init the contructor correctly', async () => {
          const dogTokenUriZeroPosition = await randomIpfsNft.getDogTokenUris(0);
          assert(dogTokenUriZeroPosition.includes('https://ipfs.io/ipfs'));
        });
      });

      // Request nft
      describe('request Nft', () => {
        it('fails if mintFee is not provided', async () => {
          await expect(randomIpfsNft.requestNft()).to.be.revertedWithCustomError(
            randomIpfsNft,
            'RandomIpfsNft__NeedMoreETHSent'
          );
        });

        it('reverts if payment amount is less than the mint fee', async () => {
          const testFee = mintFee.sub(ethers.utils.parseEther('0.001'));
          await expect(
            randomIpfsNft.requestNft({
              value: testFee,
            })
          ).to.be.revertedWithCustomError(randomIpfsNft, 'RandomIpfsNft__NeedMoreETHSent');
        });

        it('emits event and call the request random word', async () => {
          await expect(randomIpfsNft.requestNft({ value: mintFee.toString() })).to.emit(
            randomIpfsNft,
            'NftRequested'
          );
        });
      });

      // Fulfill random words
      describe('fullfillrandomwords', () => {
        it('can only be called after request nft', async () => {
          await expect(
            vrfCoordinatorV2Mock.fulfillRandomWords(0, randomIpfsNft.address)
          ).to.be.revertedWith('nonexistent request');
        });
        it('mints NFT after random number is returned', async () => {
          // Waiting for the fulfillrandomwords to be called
          await new Promise(async (resolve, reject) => {
            randomIpfsNft.once('NftMinted', async () => {
              try {
                const tokenCounter = await randomIpfsNft.getTokenCounter();
                // We need to set params between 0-2, because our array has 3 items
                const tokenUri = await randomIpfsNft.getDogTokenUris('2');
                assert.equal(tokenCounter.toString(), '1');
                assert.equal(tokenUri.toString().includes('https://ipfs.io/ipfs'), true);
                resolve();
              } catch (error) {
                console.log(error);
                reject(error);
              }
            });
            // First we request nft and than we listen for event
            try {
              const requestNftResponse = await randomIpfsNft.requestNft({
                value: mintFee.toString(),
              });
              const requestNftReceipt = await requestNftResponse.wait(1);
              // We need to call fulfillrandom manualy
              await vrfCoordinatorV2Mock.fulfillRandomWords(
                requestNftReceipt.events[1].args.requestId,
                randomIpfsNft.address
              );
            } catch (error) {
              console.log(error);
              reject(error);
            }
          });
        });
      });

      // Get breed testing
      describe('getBreedFromModdedRng', () => {
        it('if random number is 0-9, it should be pug(0)', async () => {
          moddedRng = 9;
          const expectedZero = await randomIpfsNft.getBreedFromModdedRng(moddedRng);
          assert.equal(expectedZero, '0');
        });
        it('if random number is 10-29, it should be shiba-inu(1)', async () => {
          moddedRng = 29;
          const expectedOne = await randomIpfsNft.getBreedFromModdedRng(moddedRng);
          assert.equal(expectedOne, '1');
        });
        it('if random number is 30-99, it should be st. bernard(2)', async () => {
          moddedRng = 30;
          const expectedTwo = await randomIpfsNft.getBreedFromModdedRng(moddedRng);
          assert.equal(expectedTwo, '2');
        });
        it('if random number is higher than 100, it should throw an err', async () => {
          moddedRng = 100;
          await expect(
            randomIpfsNft.getBreedFromModdedRng(moddedRng)
          ).to.be.revertedWithCustomError(randomIpfsNft, 'RandomIpfsNft__RangeOutOfBounds');
        });
      });
    });
