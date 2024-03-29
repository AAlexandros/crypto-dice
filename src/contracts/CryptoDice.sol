// SPDX-License-Identifier: UNLICENCED
pragma solidity 0.7.6;

contract CryptoDice {

    /*
        * Constants
    */
    uint n = 16;

    // The max of the dice
    uint DICE_MAX = 6;


    /*
        * State variables. These variables are saved in the state on the contract.
        * Every change of these variables costs gas, and so should be done with caution.
    */

    // The owner of the contract.
    address payable private owner;
    // Used to lock owner's profit while a game is conducted.
    uint private ownersProfitLocked;

    address payable private firstPlayer;
    address payable private secondPlayer;

    // The timestamp of the block, when the first player joined.
    uint private firstPlayerJoinedTime;

    // The timer to count the time the second has left to commit his initial seed.
    uint private timer;

    bytes32 private blockHash;

    mapping(address => bytes32) public hashSeeds;
    mapping(address => bytes32) public revealedSeeds;

    /*
        *CryptoDice Events.
    */
    event NewGame(address _firstPlayer, address _secondPlayer);
    event DiceReveal(uint _firstDie, uint _secondDie);

    constructor() {
        owner = msg.sender;
    }

    /*
        * The external public API.
    */
    function play(bytes32 _hashcode) external payable checkStateForPlay {
        address payable playerAddress = msg.sender;
        hashSeeds[playerAddress] = _hashcode;
        // The first player joins the game.
        if (isEmpty(firstPlayer)) {
            // Lock the ether of the first player.
            ownersProfitLocked = 1 ether;
            // Record the time of the block when the first player joined, needed for the cancel method.
            firstPlayerJoinedTime = block.timestamp;
            firstPlayer = playerAddress;
            // When the first player joins the game, an event that has 0 as the second address is emitted.
            emit NewGame(firstPlayer, address(0));
        }
        // The second player joins the game.
        else if (isEmpty(secondPlayer)) {
            // Lock another ether for the second player.
            ownersProfitLocked = ownersProfitLocked + 1 ether;
            secondPlayer = playerAddress;
            // Now both players are present and the game begins.
            emit NewGame(firstPlayer, secondPlayer);
        }
        // This case should have been caught by the modifier.
        // If the code enters this, something has gone really wrong.
        else {
            revert ("Illegal state reached.");
        }
    }

    function revealDice(bytes32 _seed) external isInTheGame checkStateReveal() {
        // Keep track of the time passed from the dice reveal.
        timer = block.timestamp;
        revealedSeeds[msg.sender] = _seed;
        // If both players have committed their seeds, conclude the game.
        if (revealedSeeds[firstPlayer] != 0 && revealedSeeds[secondPlayer] != 0) {
            endGame();
        }
    }

    function collectProfit() external isOwner {
        uint ownersProfit = address(this).balance - ownersProfitLocked;
        owner.transfer(ownersProfit);
    }

    function cancel() external isInTheGame checkStateForCancel {
        address payable firstPlayerTemp = firstPlayer;
        firstPlayer = address(0);
        // Unlock the owner's profit.
        ownersProfitLocked = 0;
        // Paying should always be the last action!
        firstPlayerTemp.transfer(1 ether);
    }

    function endOfTime() external isInTheGame hasGameStarted didTimePassed(60) checkStateForEndOfTime {
        // Player wins the game because of the idleness of him opponent
        address payable winningPlayerTemp = msg.sender;
        if (revealedSeeds[firstPlayer] != 0) {
            DiceReveal(1, 0);
        }
        else {
            DiceReveal(0, 1);
        }
        clearDice();
        clearAddresses();
        // Unlock the owner's profit.
        ownersProfitLocked = 0;
        // Paying should always be the last action!
        winningPlayerTemp.transfer(1.9 ether);
    }

    /*
        * Helper Functions.
    */

    function endGame() internal {
        blockHash = blockhash(block.number - 1);
        (uint resultFirstPlayer, uint resultSecondPlayer) = getRandoms();

        // if both players committed wrong seeds, end with a tie
        if (!checkSeed(firstPlayer) && !checkSeed(secondPlayer)){
            emit DiceReveal(0, 0);
            endDraw();
            return;
        }
        // if one of the players committed a wrong seed, his die result becomes 0.
        if (!checkSeed(firstPlayer)) {
            emit DiceReveal(0, resultSecondPlayer);
            endWin(secondPlayer);
            return;
        }
        if (!checkSeed(secondPlayer)) {
            emit DiceReveal(resultFirstPlayer, 0);
            endWin(firstPlayer);
            return;
        }

        // The player with the biggest result wins.
        if (resultFirstPlayer > resultSecondPlayer) {
            emit DiceReveal(resultFirstPlayer, resultSecondPlayer);
            endWin(firstPlayer);
            return;
        }
        else if (resultFirstPlayer < resultSecondPlayer){
            emit DiceReveal(resultFirstPlayer, resultSecondPlayer);
            endWin(secondPlayer);
            return;
        }
        // If both results are equal, the game ends with a draw.
        else {
            emit DiceReveal(resultFirstPlayer, resultSecondPlayer);
            endDraw();
            return;
        }
    }

    function endWin(address payable winningPlayer) internal {
        address payable winningPlayerTemp = winningPlayer;
        clearDice();
        clearAddresses();
        // Unlock the owner's profit.
        ownersProfitLocked = 0;
        // Paying should always be the last action!
        winningPlayerTemp.transfer(1.8 ether);
    }

    function endDraw() internal {
        address payable firstPlayerTemp = firstPlayer;
        address payable secondPlayerTemp = secondPlayer;
        clearDice();
        clearAddresses();
        // Unlock the owner's profit.
        ownersProfitLocked = 0;
        // Paying should always be the last action!
        firstPlayerTemp.transfer(0.9 ether);
        secondPlayerTemp.transfer(0.9 ether);
    }

    function clearAddresses() internal {
        firstPlayer = address(0);
        secondPlayer = address(0);
    }

    function clearDice() internal {
        delete hashSeeds[firstPlayer];
        delete hashSeeds[secondPlayer];
        delete revealedSeeds[firstPlayer];
        delete revealedSeeds[secondPlayer];
    }

    function getRandoms() internal view returns(uint,uint) {
        bytes32 _seedA = hashSeeds[firstPlayer];
        bytes32 _seedB = hashSeeds[secondPlayer];

        // Creates 16 1s bytes
        bytes32 nOnes = bytes32(2 **(16*n) - 1);
        // Shift left by 32-n positions bytes
        bytes32 leftMask = nOnes << ((32 - n)*8);
        //Shift right by 32-n positions bytes
        bytes32 rightMask = nOnes >> ((32 - n)*8);
        bytes32 leftA =  _seedA & leftMask;
        bytes32 rightA =  _seedA & rightMask;
        bytes32 leftB =  _seedB & leftMask;
        bytes32 rightB =  _seedB & rightMask;
        uint randomA = (uint((leftA | rightB) ^ blockHash) % DICE_MAX) + 1;
        uint randomB = (uint((leftB | rightA) ^ blockHash) % DICE_MAX) + 1;
        return (randomA, randomB);
    }

    /*
        *Function specific modifiers
    */

    // Checks if the play function can be called for the specific caller.
    modifier checkStateForPlay() {
        // Check if there is an available slot.
        require(isEmpty(firstPlayer) || isEmpty(secondPlayer), "The game has already started.");
        // Check if the player has already queued as first player.
        require(msg.sender != firstPlayer, "You have already queued to play.");
        // Exactly one Ether ether is required to play, in all other cases, the function call will be reverted.
        require(msg.value == 1 ether, "The amount of Ether to participate should be 1 Ether.");
        _;
    }

    modifier checkStateReveal() {
        // Checks if the player has not yet committed a dice.
        require(revealedSeeds[msg.sender] == 0, "You have already revealed a dice.");
        _;
    }

    modifier checkStateForCancel() {
        // Checks if the game has been started, that is when both players have joined.
        require(isEmpty(secondPlayer), "You can not cancel the game if it already has been started.");
        // Checks if two minutes have been passed.
        require(block.timestamp - firstPlayerJoinedTime > 120, "You cannot cancel the game if two minutes have not passed.");
        _;
    }

    modifier checkStateForEndOfTime() {
        // A player cannot call this function if he hasn't committed revealed his seed.
        require(revealedSeeds[msg.sender] != 0, "You can not cancel the game you haven't revealed your seed.");
        _;
    }

    // Checks if the game has not been started, that is when both players have not joined.
    modifier hasGameStarted() {
        require(!isEmpty(secondPlayer), "You can only use this function if the game has not been started.");
        _;
    }

    /*
        *General purpose modifiers
    */

    // Checks if the caller is participating in the current game.
    modifier isInTheGame() {
        // Check if there is an available slot.
        require(msg.sender == firstPlayer || msg.sender == secondPlayer, "You are not participating in the current game.");
        _;
    }

    // Checks if caller is the owner.
    modifier isOwner() {
        require(msg.sender == owner, "This function can only be called by the owner.");
        _;
    }

    // Checks if a certain amount of time has passed from the last update of the timer.
    modifier didTimePassed(uint _timePassed) {
        require(block.timestamp - timer > _timePassed, string(abi.encodePacked("The time passed from the last update of the timer, is not enough to call this function.")));
        _;
    }

    /*
        *Utility Functions.
    */
    function checkSeed(address player) internal view returns (bool) {
        return keccak256(abi.encodePacked(revealedSeeds[player])) == hashSeeds[player];
    }

    function isEmpty(address _addressToCheck) internal pure returns (bool isEmpty_) {
        isEmpty_ =  _addressToCheck == address(0);
    }
}