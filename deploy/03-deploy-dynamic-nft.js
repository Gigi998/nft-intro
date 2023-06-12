const { network, ethers } = require('hardhat');
const { developmentChains, networkConfig } = require('../helper-hardhat-config');
const { verify } = require('../utils/verify.js');
const fs = require('fs');

module.exports = async function ({ getNamedAccounts, deployments }) {
  const { deployer } = await getNamedAccounts();
  const { log, deploy } = await deployments;
  chainId = network.config.chainId;

  let ethUsdPriceFeedAddress;

  const lowSVG = fs.readFileSync('./images/dynamic/frown.svg', { encoding: 'utf8' });
  const highSVG = fs.readFileSync('./images/dynamic/happy.svg', { encoding: 'utf8' });

  if (developmentChains.includes(network.name)) {
    const ethUsdAgg = await ethers.getContract('MockV3Aggregator');
    ethUsdPriceFeedAddress = ethUsdAgg.address;
  } else {
    ethUsdPriceFeedAddress = networkConfig[chainId].ethUsdPriceFeed;
  }

  log('----------------------------------------');

  const arguments = [ethUsdPriceFeedAddress, lowSVG, highSVG];

  const dynamicSvgNft = await deploy('DynamicSvgNft', {
    from: deployer,
    args: arguments,
    log: true,
    waitConfirmations: network.config.blockConfirmation || 1,
  });

  if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
    log('Verifying');
    await verify(dynamicSvgNft.address, arguments);
    log('Verified');
  }
};

module.exports.tags = ['all', 'dynamicNft', 'main'];
