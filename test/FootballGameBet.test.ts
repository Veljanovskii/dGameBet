import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import hre from 'hardhat';

describe('FootballGameBet', function () {
  async function deployFixture() {
    const [organiser, player1, player2] = await hre.ethers.getSigners();

    const FootballGameBetFactory =
      await hre.ethers.getContractFactory('FootballGameBet');
    const stake = hre.ethers.parseEther('1');
    const startTime =
      (await hre.ethers.provider.getBlock('latest')).timestamp + 3600;

    const footballGameBet = await FootballGameBetFactory.connect(
      organiser
    ).deploy('TeamA', 'TeamB', startTime, stake, organiser.address);

    return { footballGameBet, organiser, player1, player2, stake, startTime };
  }

  describe('Betting', function () {
    it('Allows player to bet on home team', async function () {
      const { footballGameBet, player1, stake } =
        await loadFixture(deployFixture);

      await footballGameBet.connect(player1).betOnHomeTeam({ value: stake });

      const bet = await footballGameBet.bets(player1.address);
      expect(bet).to.equal(1);
    });

    it('Reverts if incorrect stake is sent', async function () {
      const { footballGameBet, player1 } = await loadFixture(deployFixture);

      await expect(
        footballGameBet
          .connect(player1)
          .betOnAwayTeam({ value: hre.ethers.parseEther('0.5') })
      ).to.be.revertedWith('Incorrect stake amount.');
    });

    it('Prevents duplicate bets', async function () {
      const { footballGameBet, player1, stake } =
        await loadFixture(deployFixture);

      await footballGameBet.connect(player1).betOnHomeTeam({ value: stake });

      await expect(
        footballGameBet.connect(player1).betOnAwayTeam({ value: stake })
      ).to.be.revertedWith('Bet already placed.');
    });
  });

  describe('Payouts', function () {
    it('Distributes winnings correctly to home team bettors', async function () {
      const { footballGameBet, player1, player2, organiser, stake } =
        await loadFixture(deployFixture);

      await footballGameBet.connect(player1).betOnHomeTeam({ value: stake });
      await footballGameBet.connect(player2).betOnHomeTeam({ value: stake });

      const balanceBefore = await hre.ethers.provider.getBalance(
        organiser.address
      );

      await footballGameBet.connect(organiser).gameFinished(2, 1); // Home wins
      expect(await footballGameBet.isSettled()).to.be.true;

      const balanceAfter = await hre.ethers.provider.getBalance(
        organiser.address
      );
      expect(balanceAfter).to.be.gt(balanceBefore); // Organiser got 5% fee
    });

    it('Refunds all players if game is a draw', async function () {
      const { footballGameBet, player1, player2, stake, organiser } =
        await loadFixture(deployFixture);

      await footballGameBet.connect(player1).betOnHomeTeam({ value: stake });
      await footballGameBet.connect(player2).betOnAwayTeam({ value: stake });

      const balanceBefore = await hre.ethers.provider.getBalance(
        player1.address
      );

      await footballGameBet.connect(organiser).gameFinished(1, 1); // draw
      expect(await footballGameBet.isSettled()).to.be.true;

      const balanceAfter = await hre.ethers.provider.getBalance(
        player1.address
      );
      expect(balanceAfter).to.be.gt(balanceBefore); // Player got refund
    });
  });

  describe('Frontend View Helpers', function () {
    it('Counts home and away bets correctly', async function () {
      const { footballGameBet, player1, player2, stake } =
        await loadFixture(deployFixture);

      await footballGameBet.connect(player1).betOnHomeTeam({ value: stake });
      await footballGameBet.connect(player2).betOnAwayTeam({ value: stake });

      const homeCount = await footballGameBet.totalHomeBets();
      const awayCount = await footballGameBet.totalAwayBets();

      expect(homeCount).to.equal(1n);
      expect(awayCount).to.equal(1n);
    });

    it('Calculates home and away pools correctly', async function () {
      const { footballGameBet, player1, player2, stake } =
        await loadFixture(deployFixture);

      await footballGameBet.connect(player1).betOnHomeTeam({ value: stake });
      await footballGameBet.connect(player2).betOnAwayTeam({ value: stake });

      const homePool = await footballGameBet.homeTeamPool();
      const awayPool = await footballGameBet.awayTeamPool();

      expect(homePool).to.equal(stake);
      expect(awayPool).to.equal(stake);
    });
  });
});
