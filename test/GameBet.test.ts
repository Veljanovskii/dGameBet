import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import hre from 'hardhat';

describe('GameBet', function () {
  async function deployFixture() {
    const [organiser, voter] = await hre.ethers.getSigners();

    const GameBetFactory = await hre.ethers.getContractFactory('GameBet');
    const gameBet = await GameBetFactory.deploy();

    return { gameBet, organiser, voter };
  }

  describe('createFootballBet', function () {
    it('Creates a new FootballGameBet contract', async function () {
      const { gameBet, organiser } = await loadFixture(deployFixture);

      const stake = hre.ethers.parseEther('1');
      const startTime =
        (await hre.ethers.provider.getBlock('latest')).timestamp + 3600;

      await gameBet
        .connect(organiser)
        .createFootballBet('TeamA', 'TeamB', startTime, stake);

      const bets = await gameBet.getBets();
      expect(bets.length).to.equal(1);
    });

    it('Adds organiser to the list on first bet creation', async function () {
      const { gameBet, organiser } = await loadFixture(deployFixture);

      const stake = hre.ethers.parseEther('1');
      const startTime =
        (await hre.ethers.provider.getBlock('latest')).timestamp + 3600;

      await gameBet
        .connect(organiser)
        .createFootballBet('TeamA', 'TeamB', startTime, stake);

      const organisers = await gameBet.getOrganisers();
      expect(organisers).to.include(organiser.address);
    });
  });

  describe('Voting', function () {
    it('Allows a valid user to vote on organiser', async function () {
      const { gameBet, organiser, voter } = await loadFixture(deployFixture);

      const stake = hre.ethers.parseEther('1');
      const startTime =
        (await hre.ethers.provider.getBlock('latest')).timestamp + 3600;

      await gameBet
        .connect(organiser)
        .createFootballBet('TeamA', 'TeamB', startTime, stake);
      expect((await gameBet.ratings(organiser.address)).active).to.be.true;
      const bets = await gameBet.getBets();
      const footballGameBetAddress = bets[0];

      const FootballGameBetFactory =
        await hre.ethers.getContractFactory('FootballGameBet');
      const footballGameBet = FootballGameBetFactory.attach(
        footballGameBetAddress
      );

      await footballGameBet.connect(voter).betOnHomeTeam({ value: stake });

      // fast forward time
      await hre.network.provider.send('evm_increaseTime', [4000]);
      await hre.network.provider.send('evm_mine');

      const expectedOrganiser = await footballGameBet.organiser();

      expect(
        await gameBet
          .connect(voter)
          .canVote(expectedOrganiser, footballGameBetAddress)
      ).to.be.true;

      await gameBet
        .connect(voter)
        .vote(expectedOrganiser, footballGameBetAddress, 5);
    });
  });
});
