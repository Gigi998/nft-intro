const { network, ethers } = require('hardhat');
const { developmentChains } = require('../helper-hardhat-config.js');
const { verify } = require('../utils/verify.js');
const { networkConfig } = require('../helper-hardhat-config.js');
const { storeImages, storeTokenUriMetadata } = require('../utils/uploadToPinata.js');

const VRF_SUB_FUND_AMOUNT = ethers.utils.parseEther('2');
const imagesLocation = './images/random/';

const metadataTemplate = {
  name: '',
  description: '',
  image: '',
  attributes: [{ trait_type: 'Cuteness', value: 100 }],
};

let tokenUris = [
  'https://ipfs.io/ipfs/QmSbccn9wZssYdvYicxqQ48TxLpBqWY55RBKWtaxTHisqo',
  'https://ipfs.io/ipfs/QmS3nZpKdSMe41Hf9QS3H52t9DrnAYcnMqBv73bEwu47t3',
  'https://ipfs.io/ipfs/QmVLVcQfQz78c4CPoZXhhaPXBZmy7swyf1SGsLqktNVqCs',
];

module.exports = async function ({ getNamedAccounts, deployments }) {
  const { deployer } = await getNamedAccounts();
  const { log, deploy } = await deployments;
  chainId = network.config.chainId;

  // get the ipfs hashes of our images
  if (process.env.UPLOAD_TO_PINATA == 'true') {
    tokenUris = await handleTokenUris();
  }
  // 1. With our own IPFS node
  // 2. Pinata (centralized)
  // 3. NFT.storage (decentralized)

  let vrfCoordinatorV2Address;
  let subscriptionId;
  let vrfCoordinatorV2Mock;

  // If we are on the local network
  if (developmentChains.includes(network.name)) {
    vrfCoordinatorV2Mock = await ethers.getContract('VRFCoordinatorV2Mock');
    vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address;
    // Programatic subscription
    const transactionResponse = await vrfCoordinatorV2Mock.createSubscription();
    const transactionReceipt = await transactionResponse.wait(1);
    subscriptionId = transactionReceipt.events[0].args.subId;
    // Fund the subscripiton, usually you need the link token on real network
    await vrfCoordinatorV2Mock.fundSubscription(subscriptionId, VRF_SUB_FUND_AMOUNT);
  } else {
    vrfCoordinatorV2Address = networkConfig[chainId]['vrfCoordinatorV2'];
    subscriptionId = networkConfig[chainId]['subscriptionId'];
  }

  log('--------------------------------------');

  const arguments = [
    vrfCoordinatorV2Address,
    subscriptionId,
    networkConfig[chainId].gasLane,
    networkConfig[chainId].callbackGasLimit,
    tokenUris,
    networkConfig[chainId].mintFee,
  ];

  const randomIpfs = await deploy('RandomIpfsNft', {
    from: deployer,
    args: arguments,
    log: true,
    waitConfirmations: network.config.blockConfirmations || 1,
  });

  log('---------------------------------------');
  // Verification
  if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
    log('Verifying');
    await verify(randomIpfs.address, arguments);
    log('Verified');
  }

  // Adding consumer so that we can make tests
  if (developmentChains.includes(network.name)) {
    await vrfCoordinatorV2Mock.addConsumer(subscriptionId, randomIpfs.address);
    log('consumer is added');
  }
};

// Only if PINATA is true
async function handleTokenUris() {
  // store the  image in IPFS
  const { responses: imageUploadResponses, files } = await storeImages(imagesLocation);

  for (let imgUploadResponseIndex in imageUploadResponses) {
    // upload metada
    let tokenUriMetadata = { ...metadataTemplate };
    tokenUriMetadata.name = files[imgUploadResponseIndex].replace('.png', ''); // ["pug", "shiba-inu",....]
    tokenUriMetadata.description = `An adorable ${tokenUriMetadata.name} pup!`;
    tokenUriMetadata.image = `https://ipfs.io/ipfs/${imageUploadResponses[imgUploadResponseIndex].IpfsHash}`;
    // store the metadata in IPFS
    // store the json to pinata /ipfs
    const metadataUploadResponse = await storeTokenUriMetadata(tokenUriMetadata);
    tokenUris.push(`https://ipfs.io/ipfs/${metadataUploadResponse.IpfsHash}`);
  }
  console.log('Token URIs Uploaded! They are:');
  console.log(tokenUris);
  return tokenUris;
}

module.exports.tags = ['all', 'randomipfs', 'main'];
