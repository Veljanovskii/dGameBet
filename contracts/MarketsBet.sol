// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

contract MarketsBet {
    enum Market {
        UG_0_2,
        UG_3_PLUS,
        GG
    }

    address payable public organiser;
    address public matchContract;
    uint256 public startTime;
    uint256 public stake;
    bool public isSettled;

    mapping(Market => address payable[]) private _players;
    mapping(Market => mapping(address => bool)) public hasBet;

    event BetPlaced(Market indexed market, address indexed bettor);
    event MarketSettled(Market indexed market, uint256 winners, uint256 totalPool, uint256 organiserFee);
    event AllMarketsSettled(uint8 homeGoals, uint8 awayGoals);

    constructor(address payable _organiser, uint256 _startTime, uint256 _stake, address _matchContract) {
        require(_organiser != address(0), "Invalid organiser");
        require(_matchContract != address(0), "Invalid match");
        require(_startTime > block.timestamp, "Invalid startTime");
        require(_stake > 0, "Stake must be positive");

        organiser = _organiser;
        startTime = _startTime;
        stake = _stake;
        matchContract = _matchContract;
    }

    // -------- Betting --------

    function betUG_0_2() external payable bettingOpen stakeCorrect notYet(Market.UG_0_2) {
        _place(Market.UG_0_2);
    }

    function betUG_3_PLUS() external payable bettingOpen stakeCorrect notYet(Market.UG_3_PLUS) {
        _place(Market.UG_3_PLUS);
    }

    function betGG() external payable bettingOpen stakeCorrect notYet(Market.GG) {
        _place(Market.GG);
    }

    function _place(Market m) internal {
        hasBet[m][msg.sender] = true;
        _players[m].push(payable(msg.sender));
        emit BetPlaced(m, msg.sender);
    }

    // -------- Views for UI --------

    function totalBets(Market m) external view returns (uint256) {
        return _players[m].length;
    }

    function poolSize(Market m) external view returns (uint256) {
        return _players[m].length * stake;
    }

    function playerAt(Market m, uint256 idx) external view returns (address) {
        return _players[m][idx];
    }

    // -------- Settlement --------
    
    function settleAll(uint8 homeGoals, uint8 awayGoals) external onlyOrganiserOrMatch {
        require(!isSettled, "Markets already settled");
        // optional: require(address(this).balance > 0, "No funds");

        // Evaluate winners per market
        bool ug0_2_win = (uint256(homeGoals) + uint256(awayGoals)) <= 2;
        bool ug3p_win = (uint256(homeGoals) + uint256(awayGoals)) >= 3;
        bool gg_win   = (homeGoals >= 1 && awayGoals >= 1);

        _settleMarket(Market.UG_0_2, ug0_2_win);
        _settleMarket(Market.UG_3_PLUS, ug3p_win);
        _settleMarket(Market.GG, gg_win);

        isSettled = true;
        emit AllMarketsSettled(homeGoals, awayGoals);
    }

    function _settleMarket(Market m, bool isWinningCondition) internal {
        address payable[] storage players = _players[m];
        uint256 totalPool = players.length * stake;

        if (totalPool == 0) {
            // nothing placed on this market
            emit MarketSettled(m, 0, 0, 0);
            return;
        }

        if (!isWinningCondition) {
            // Refund everyone in this single-sided market
            for (uint256 i = 0; i < players.length; i++) {
                (bool ok, ) = players[i].call{value: stake}("");
                require(ok, "Refund failed");
            }
            emit MarketSettled(m, 0, totalPool, 0);
            return;
        }

        // winners = everyone who placed a bet in this market
        uint256 winners = players.length;
        uint256 organiserFee = (totalPool * 5) / 100;
        uint256 distributable = totalPool - organiserFee;
        uint256 perWinner = distributable / winners;

        for (uint256 i = 0; i < players.length; i++) {
            (bool ok, ) = players[i].call{value: perWinner}("");
            require(ok, "Payout failed");
        }

        (bool feeOk, ) = organiser.call{value: organiserFee}("");
        require(feeOk, "Organiser fee failed");

        emit MarketSettled(m, winners, totalPool, organiserFee);
    }

    // -------- Modifiers --------

    modifier bettingOpen() {
        require(block.timestamp <= startTime, "Betting closed");
        _;
    }

    modifier stakeCorrect() {
        require(msg.value == stake, "Incorrect stake amount");
        _;
    }

    modifier notYet(Market m) {
        require(!hasBet[m][msg.sender], "Already bet this market");
        _;
    }

    modifier onlyOrganiser() {
        require(msg.sender == organiser, "Only organiser");
        _;
    }

    modifier onlyOrganiserOrMatch() {
        require(msg.sender == organiser || msg.sender == matchContract, "Not authorised");
        _;
    }
}
