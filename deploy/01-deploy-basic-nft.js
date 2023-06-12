const { network } = require('hardhat');
const { developmentChains } = require('../helper-hardhat-config.js');
const { verify } = require('../utils/verify.js');

module.exports = async function ({ getNamedAccounts, deployments }) {
  const { deployer } = await getNamedAccounts();
  const { log, deploy } = await deployments;

  const arguments = [];

  const basicNft = await deploy('BasicNft', {
    from: deployer,
    args: arguments,
    log: true,
    waitConfiramtions: network.config.blockConfirmations || 1,
  });

  if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
    log('Verifying');
    await verify(basicNft.address, arguments);
    log('Verified');
  }
};

module.exports.tags = ['all', 'basicNft', 'main'];
