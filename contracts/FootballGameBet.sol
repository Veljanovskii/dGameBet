// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "./MarketsBet.sol";

contract FootballGameBet {
    string public homeTeam;
    string public awayTeam;
    uint8  public homeTeamGoals;
    uint8  public awayTeamGoals;
    uint256 public startTime;
    address payable public organiser;
    uint256 public stake;
    bool public isSettled = false;

    // NEW: remember the factory that deployed us (GameBet)
    address public factory;

    // markets contract for side markets
    address public markets;

    // 1 = home, 2 = away
    mapping(address => uint8) public bets;
    address payable[] public players;

    constructor(
        string memory _homeTeam,
        string memory _awayTeam,
        uint256 _startTime,
        uint256 _stake,
        address payable _organiser
    ) {
        require(_startTime > block.timestamp, "Invalid game start time.");
        require(bytes(_homeTeam).length > 0, "Home team required.");
        require(bytes(_awayTeam).length > 0, "Away team required.");
        require(_stake > 0, "Stake must be positive.");

        homeTeam  = _homeTeam;
        awayTeam  = _awayTeam;
        startTime = _startTime;
        organiser = _organiser;
        stake     = _stake;

        // record factory (GameBet) so it can set markets
        factory = msg.sender;
    }

    // ✅ Allow organiser OR factory to set markets exactly once
    function setMarkets(address _markets) external {
        require(msg.sender == organiser || msg.sender == factory, "Not authorized");
        require(markets == address(0), "Markets already set");
        require(_markets != address(0), "Invalid markets");
        markets = _markets;
    }

    function betOnHomeTeam() external payable canPlaceBet bettingOpen stakeCorrect {
        bets[msg.sender] = 1;
        players.push(payable(msg.sender));
    }

    function betOnAwayTeam() external payable canPlaceBet bettingOpen stakeCorrect {
        bets[msg.sender] = 2;
        players.push(payable(msg.sender));
    }

    function gameFinished(uint8 homeGoals, uint8 awayGoals) external onlyOrganiser {
        require(address(this).balance > 0, "Contract balance empty.");

        homeTeamGoals = homeGoals;
        awayTeamGoals = awayGoals;
        isSettled = true;

        uint8 winner = homeGoals > awayGoals ? 1 : (awayGoals > homeGoals ? 2 : 0);

        uint256 totalPool = address(this).balance;
        if (winner == 0) {
            for (uint256 i = 0; i < players.length; i++) {
                (bool refunded, ) = players[i].call{value: stake}("");
                require(refunded, "Refund failed.");
            }
        } else {
            uint256 organiserFee = (totalPool * 5) / 100;
            uint256 winningAmount = totalPool - organiserFee;
            uint256 numOfWinners;

            for (uint256 i = 0; i < players.length; i++) {
                if (bets[players[i]] == winner) {
                    numOfWinners++;
                }
            }
            uint256 payoutPerWinner = numOfWinners == 0 ? 0 : (winningAmount / numOfWinners);

            for (uint256 i = 0; i < players.length; i++) {
                if (bets[players[i]] == winner) {
                    (bool success, ) = players[i].call{value: payoutPerWinner}("");
                    require(success, "Payout failed.");
                }
            }

            (bool organiserPaid, ) = organiser.call{value: organiserFee}("");
            require(organiserPaid, "Organizer payout failed.");
        }

        if (markets != address(0)) {
            MarketsBet(markets).settleAll(homeGoals, awayGoals);
        }
    }

    function totalHomeBets() public view returns (uint256 count) {
        for (uint256 i = 0; i < players.length; i++) {
            if (bets[players[i]] == 1) count++;
        }
    }

    function totalAwayBets() public view returns (uint256 count) {
        for (uint256 i = 0; i < players.length; i++) {
            if (bets[players[i]] == 2) count++;
        }
    }

    function homeTeamPool() external view returns (uint256) {
        return stake * totalHomeBets();
    }

    function awayTeamPool() external view returns (uint256) {
        return stake * totalAwayBets();
    }

    function getIsSettled() external view returns (bool) {
        return isSettled;
    }

    modifier bettingOpen() {
        require(block.timestamp <= startTime, "Betting closed.");
        _;
    }
    modifier stakeCorrect() {
        require(msg.value == stake, "Incorrect stake amount.");
        _;
    }
    modifier canPlaceBet() {
        require(bets[msg.sender] == 0, "Bet already placed.");
        _;
    }
    modifier onlyOrganiser() {
        require(msg.sender == organiser, "Only organiser allowed.");
        _;
    }
}