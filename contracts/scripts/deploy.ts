import { HardhatRuntimeEnvironment } from 'hardhat/types';

async function main(hre: HardhatRuntimeEnvironment) {
  const { ethers } = hre;

  const [deployer] = await ethers.getSigners();

  console.log('Deploying contracts with the account:', deployer.address);

  const GameBetFactory = await ethers.getContractFactory('GameBet');
  const gameBet = await GameBetFactory.deploy();

  await gameBet.waitForDeployment();

  console.log('GameBet deployed to:', await gameBet.getAddress());
}

main(require('hardhat')).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
