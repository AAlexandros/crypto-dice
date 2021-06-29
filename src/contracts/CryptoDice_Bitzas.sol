// SPDX-License-Identifier: UNLICENCED
pragma solidity 0.7.6;

contract CryptoDice {
    
    /*
        * State variables. These variables are saved in the state on the contract.
        * Every change of these variables costs gas, and so should be done with caution.
    */


    // Used to store owner's address
    address payable private owner;
    // Used to lock owner's profit while a game is conducted.
    uint private ownersProfitLocked;


    // Used to store players address
    address payable private firstPlayer;
    address payable private secondPlayer;
    
    
    // Store the hashes of secret values,address of player
    mapping(address => bytes32) private PlayerHash;
    
    // Store the secret values
    mapping(address => bytes32) private secretValue;
    
    // Used to record whos has revealed
    mapping(address => uint) private PlayerRevealed;

    // The timestamp of the block, when the first player joined.
    uint private firstPlayerJoinedTime;
    uint private secondPlayerJoinedTime;

    // The timer for the player to reveal the secret value.
    uint private timer;
    


    /*
        *CryptoDice Events.
    */
    event NewGame(address _firstPlayer, address _secondPlayer);
    event Commit(bytes32 _hash);
    event Reveal(bytes32 _commitedHash, bytes32 _actualHash, bytes32 _seed);
    event Winner(uint _diceFirst, uint _diceSecond, address _winner);

    
    constructor() {
    owner = msg.sender;
    }

    
    /*********************************
        * The external public API.
        *
    **********************************/
    
    function play(bytes32 _hash) external payable checkPlay {
        address payable playerAddress = msg.sender;
        // The first player joins the game.
        if (isEmpty(firstPlayer)) {
        
            // Lock the ether of the first player.
            ownersProfitLocked = 1 ether;
        
            // Record the time of the block when the first player joined, needed for the cancel method.
            firstPlayerJoinedTime = block.timestamp;
            
            
            firstPlayer = playerAddress;
            PlayerHash[firstPlayer] = _hash;
            PlayerRevealed[firstPlayer] = 0;
        
            // When the first player joins the game, an event that has 0 as the second address is omited.
            emit NewGame(firstPlayer, address(0));
        }
        // The second player joins the game.
        else if (isEmpty(secondPlayer)) {
            
            // Lock another ether for the second player.
            ownersProfitLocked = ownersProfitLocked + 1 ether;
            
            // Record the time of the block when the second player joined, needed for the cancel method.
            secondPlayerJoinedTime = block.timestamp;
            secondPlayer = playerAddress;
            PlayerHash[secondPlayer] = _hash;
            PlayerRevealed[secondPlayer] = 0;
            
            // Now both players are present and the game begins.
            emit NewGame(firstPlayer, secondPlayer);
        }
        // This case should have been caught by the modifier.
        // If the code enters this, something has gone really wrong.
        else {
            revert ("Illegal state reached.");
        }
    }
    
    
    function RevealDice(bytes32 _secretValue) external isInTheGame checkHaveRevealed returns(string memory, bool, bytes32, bytes32){
        bool val = checkHash(_secretValue);
        if (val){
            if((PlayerRevealed[firstPlayer] == 0) && (PlayerRevealed[secondPlayer] == 0)){
                // Emit a reveal Event 
                emit Reveal(PlayerHash[msg.sender], keccak256(abi.encodePacked(_secretValue)), _secretValue);
            
                // Player has revealed
                PlayerRevealed[msg.sender] = 1;   
                secretValue[msg.sender] = _secretValue;
                        
                // Initialize the timer of this game.
                timer = block.timestamp;
            }
            else{
                // Emit a reveal Event 
                emit Reveal(PlayerHash[msg.sender], keccak256(abi.encodePacked(_secretValue)), _secretValue);
            
                // Player has revealed
                PlayerRevealed[msg.sender] = 1;  
                secretValue[msg.sender] = _secretValue;
                
                // Check who won and end the game
                checkWinner();
            }
        }
        else{
            return ("player lied", val, keccak256(abi.encodePacked(_secretValue)), PlayerHash[msg.sender]);
            
        }
    }

    
    
    function collectProfit() external isOwner{
        uint ownersProfit = address(this).balance - ownersProfitLocked;
        owner.transfer(ownersProfit);
    }

    function cancel() external isInTheGame checkStateForCancel {
        address payable firstPlayerTemp = firstPlayer;
        delete PlayerHash[firstPlayer];
        delete PlayerRevealed[firstPlayer];
        firstPlayer = address(0);
        
        // Unlock the owner's profit.
        ownersProfitLocked = 0;
        
        // Paying should always be the last action!
        firstPlayerTemp.transfer(1 ether);
        
        
    }

    function ur2slow() external checkBothReveal didTimePassed(300) {
        address payable winningPlayerTemp = msg.sender;
        emit Winner(0,0,winningPlayerTemp);
        clearGame();
        
        // Unlock the owner's profit.
        ownersProfitLocked = 0;
        
        // Paying should always be the last action!
        winningPlayerTemp.transfer(1.9 ether);
    }

    // Because the players can make the game stuck the game by not playing at all, the owner can intervene after 5 minutes.
    // After calling this method, the players are kicked and the host takes the full ether amount.
    function gameExpired() external hasGameStarted isOwner didTimePassed(300) {
        clearGame();
        ownersProfitLocked = 0;
    }
    

    
    /*********************************
    
       * Helper Functions 
       * 
    **********************************/



    
    
    function checkHash(bytes32 _secretValue) internal returns(bool){
        return (keccak256(abi.encodePacked(_secretValue)) == PlayerHash[msg.sender]); 
    }
    
    function checkWinner() internal {
        bytes32  randomA;
        bytes32  randomB;
        uint diceA;
        uint diceB;
        bytes32 prevBlockHash;
            // 
        address payable  WinnerPlayer;
        (randomA,randomB) = getRandoms(secretValue[firstPlayer],secretValue[secondPlayer]);
        
        prevBlockHash = keccak256(abi.encodePacked("Blockhash"));
        // prevBlockHash = blockhash(block.number - 1); 
        diceA = uint(randomA ^ prevBlockHash) % 6;
        diceB = uint(randomB ^ prevBlockHash) % 6;
        if (diceA == 0){
            diceA = 6;
        }
        if (diceB ==0 ){
            diceB = 6;
        }
        if (diceA > diceB){
            WinnerPlayer = firstPlayer;
            emit Winner(diceA, diceB, WinnerPlayer);
            endWin(WinnerPlayer);
        }
        else if (diceA<  diceB){
            WinnerPlayer = secondPlayer;
            emit Winner(diceA, diceB, WinnerPlayer);
            endWin(WinnerPlayer);
        }
        else{
            emit Winner(diceA, diceB, address(0));
            endDraw();
            
        }
    }
    
    
    function endWin(address payable _winner) internal {
        clearGame();
        
        // Unlock the owner's profit.
        ownersProfitLocked = 0;
        
        
        // Paying should always be the last action!
        _winner.transfer(1.8 ether);
    }
    
    
    
    function endDraw() internal {
        clearGame();
        // Unlock the owner's profit.
        ownersProfitLocked = 0;
        
        // Paying should always be the last action!
        firstPlayer.transfer(0.9 ether);
        secondPlayer.transfer(0.9 ether);
    }
        
    function getRandoms(bytes32 _seedA, bytes32 _seedB) internal  returns(bytes32,bytes32) {
        bytes32  leftA;
        bytes32  leftB;
        bytes32  rightA;
        bytes32  rightB;
        bytes32  nOnes;
        bytes32  leftMask;
        bytes32  rightMask;
        bytes32  randomA;
        bytes32  randomB;
        
        // split of 32 bytes requires n =16
        uint  n = 16;
        
        nOnes = bytes32(2 **(16*n) - 1); // Creates 16 1s bytes
        leftMask = nOnes << ((32 - n)*8); // Shift left by 32-n positions bytes
        rightMask = nOnes >> ((32 - n)*8); //Shift right by 32-n positions bytes
        leftA =  _seedA & leftMask; 
        rightA =  _seedA & rightMask;
        leftB =  _seedB & leftMask;
        rightB =  _seedB & rightMask;
        randomA = leftA | rightB; 
        randomB = leftB | rightA;
        return (randomA, randomB); 
    }
    
    function clearGame() internal {
        delete PlayerHash[firstPlayer];
        delete PlayerRevealed[firstPlayer];
        delete secretValue[firstPlayer];
        delete PlayerHash[secondPlayer];
        delete PlayerRevealed[secondPlayer];
        delete secretValue[secondPlayer];
        
        firstPlayer = address(0);
        secondPlayer = address(0);
        firstPlayerJoinedTime = 0;
        secondPlayerJoinedTime = 0;
    }  
    
    
    function getPlayerNotPlaying() internal view returns (address payable player_) {
        if (msg.sender == firstPlayer) {
            return secondPlayer;
        }
        return firstPlayer;
    }
    
    /*********************************
        *Function specific modifiers
        *
    **********************************/
    
    
    // Checks if the play function can be called for the specific caller.
    
    
    
    modifier checkPlay() {
        // Check if there is an available slot.
        require(isEmpty(firstPlayer) || isEmpty(secondPlayer), "The game has already started.");
        // Check if the player has already queued as first player.
        require(msg.sender != firstPlayer, "You have already queued to play.");
        // Exacly one Ether ether is required to play, in all other cases, the function call will be reverted.
        require(msg.value == 1 ether, "The amount of Ether to participate should be 1 Ether.");
        _;
    }
    
    
    // Checks if player have revealed 
    modifier checkHaveRevealed() {
        //  player must be in the game
        require(msg.sender == firstPlayer || msg.sender == secondPlayer, "You are not participating in the current game.");
        _;
        // Checks if the player have revealed
        require(PlayerRevealed[msg.sender] == 0, "You can't reveal again");
        _;
    }
    
    // Checks if both players have revealed 
    modifier checkBothReveal() {
        //  player must be in the game
        require(msg.sender == firstPlayer || msg.sender == secondPlayer, "You are not participating in the current game.");
        _;
        // Checks if both players have revealed 
        require(PlayerRevealed[firstPlayer] == 0 || PlayerRevealed[secondPlayer] == 0, "Both Players have to reveal"  );
        _;
    }
    
    
    modifier checkStateForCancel() {
        // Checks if the game has been started, that is when both players have joined.
        require(isEmpty(secondPlayer), "You can not cancel the game if it already has been started.");
        // Checks if two minutes have been passed.
        require(block.timestamp - firstPlayerJoinedTime > 120, "You cannot cancel the game if two minutes have not passed.");
        _;
    }
    
    
    // Checks if a certain amount of time has passed from the last update of the timer.
    modifier didTimePassed(uint _timePassed) {
        require(block.timestamp - timer > _timePassed, string(abi.encodePacked("The time passed from the last update of the timer, is not enought to call this function.")));
        _;
    }
    
    
    // Checks if the game has not been started, that is when both players have not joined.
    modifier hasGameStarted() {
        require(!isEmpty(secondPlayer), "You can only use this function if the game has not been started.");
        _;
    }

    
    // Checks if the caller is participating in the current game.
    modifier isInTheGame() {
        require(msg.sender == firstPlayer || msg.sender == secondPlayer, "You are not participating in the current game.");
        _;
    }

    
    // Checks if caller is the owner.
    modifier isOwner() {
        require(msg.sender == owner, "This function can only be called by the owner.");
        _;
    }
    

    

    
    /*********************************
        *Utility Functions.
        *
    **********************************/
    
    
    function isEmpty(address _addressToCheck) internal pure returns (bool isEmpty_) {
        isEmpty_ =  _addressToCheck == address(0);
    }
    
    
}



