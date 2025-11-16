// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "./FootballGameBet.sol";

contract GameBet {
    struct Organiser {
        bool active;
        uint256 totalRate;
        uint256 numberOfTimesRated;
    }

    address[] public organisers;
    mapping(address => Organiser) public ratings;
    mapping(address => mapping(address => mapping(address => bool))) public hasVoted;

    address[] public allBets;

    function createFootballBet(
        string memory homeTeam,
        string memory awayTeam,
        uint256 startTime,
        uint256 stake) external payable {
            FootballGameBet newBet = new FootballGameBet(homeTeam, awayTeam, startTime, stake, payable(msg.sender));
            allBets.push(address(newBet));

            MarketsBet markets = new MarketsBet(payable(msg.sender), startTime, stake);
            newBet.setMarkets(address(markets));

            if (!ratings[msg.sender].active) {
                ratings[msg.sender].active = true;
                organisers.push(msg.sender);
            }
    }

    function getBets() external view returns (address[] memory) {
        return allBets;
    }

    function getOrganisers() external view returns (address[] memory) {
        return organisers;
    }

    function canVote(address organiser, address bet) public view returns (bool) {
        if (msg.sender == organiser) return false;
        if (!ratings[organiser].active) return false;

        FootballGameBet gameBet = FootballGameBet(payable(bet));

        if (block.timestamp < gameBet.startTime()) return false;
        if (gameBet.organiser() != organiser) return false;
        if (gameBet.bets(msg.sender) == 0) return false;
        if (hasVoted[organiser][bet][msg.sender]) return false;

        return true;
    }

    function vote(address organiser, address bet, uint8 rate) external {
        require(rate <= 5, "Rate must be between 0 and 5.");
        require(canVote(organiser, bet), "You can't vote.");

        hasVoted[organiser][bet][msg.sender] = true;
        ratings[organiser].totalRate += rate;
        ratings[organiser].numberOfTimesRated++;
    }
}