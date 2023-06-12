const { network } = require('hardhat');
const { developmentChains, DECIMALS, INIT_PRICE } = require('../helper-hardhat-config');

// 0.25 is premium it cost 0.25 LINK per request
const BASE_FEE = '250000000000000000'; // 0.25 is this the premium in LINK?
// link per gas. Calculated value chainlink nodes pay to give us random num and do external exectuion
// So if eth goes up, the gas_price fee will also go up
const GAS_PRICE_LINK = 1 * 10 ** 9;

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();
  const args = [BASE_FEE, GAS_PRICE_LINK];

  if (developmentChains.includes(network.name)) {
    log('Local network detected! Deploying mocks...');
    // deploy a mock vrfcoordinator
    await deploy('VRFCoordinatorV2Mock', {
      from: deployer,
      log: true,
      args: args,
    });
    await deploy('MockV3Aggregator', {
      from: deployer,
      log: true,
      args: [DECIMALS, INIT_PRICE],
    });
    log('Mocks deployed!!');
    log('---------------------------------------');
  }
};

module.exports.tags = ['all', 'mocks', 'main'];
