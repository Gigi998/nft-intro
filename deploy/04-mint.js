const { ethers, network } = require('hardhat');
const { developmentChains } = require('../helper-hardhat-config');

module.exports = async function ({ getNamedAccounts }) {
  const { deployer } = await getNamedAccounts();

  // Basic nft
  const basicNft = await ethers.getContract('BasicNft', deployer);
  const basicMintTx = await basicNft.mintNft();
  await basicMintTx.wait(1);
  console.log(`Basic NFT index 0 has tokenURI: ${await basicNft.tokenURI(0)}`);

  // Random IPFS nft
  const randomIpfsNft = await ethers.getContract('RandomIpfsNft', deployer);
  const mintFee = await randomIpfsNft.getMintFee();

  // Promise
  await new Promise(async (resolve, reject) => {
    setTimeout(resolve, 300000); //5min
    // setting up event
    randomIpfsNft.once('NftMinted', async () => {
      console.log(`Random IPFS NFT index 0 tokenURI: ${await randomIpfsNft.tokenURI(0)}`);
      resolve();
    });

    const randomIpfsNftMintTx = await randomIpfsNft.requestNft({ value: mintFee.toString() });
    const randomIpfsNftMintTxReceipt = await randomIpfsNftMintTx.wait(1);

    // if we are on testnet
    if (developmentChains.includes(network.name)) {
      const requestId = randomIpfsNftMintTxReceipt.events[1].args.requestId.toString();
      const vrfCoordinatorV2Mock = await ethers.getContract('VRFCoordinatorV2Mock', deployer);
      await vrfCoordinatorV2Mock.fulfillRandomWords(requestId, randomIpfsNft.address);
    }
  });

  // Dynamic svg
  const highValue = ethers.utils.parseEther('0.00000001');
  const dynamicSvgNft = await ethers.getContract('DynamicSvgNft', deployer);
  const dynamicSvgNftMintTx = await dynamicSvgNft.mintNft(highValue);
  await dynamicSvgNftMintTx.wait(1);
  console.log(`Dynamic SVG NFT index 0 token URI: ${await dynamicSvgNft.tokenURI(0)}`);
};

module.exports.tags = ['all', 'mint'];
