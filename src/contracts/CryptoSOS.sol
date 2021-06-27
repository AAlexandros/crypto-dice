pragma solidity 0.7;


contract CryptoSOS{
    address payable public owner;
    address payable internal player1;
    address payable internal player2;
    address payable internal winner;
    address payable internal lastPlayed;
    
    uint internal startTime;
    uint internal ur2slowTime;
    uint internal gameOverTime;
    uint internal turn;
    uint internal lastMove;
    uint8 internal lastTile;

    bool internal isGameOver;
    bool internal isWin;
    bool internal isPlay;
    
    event NewGame(address, address);
    event MoveEvent(address, uint8, uint8);
    event Resolution(address, string, address, string);
    event CollectProfit(address, string, address, string, uint);
    event Error(address, string);
    
    string[] board;
    
    constructor(){
        owner = msg.sender;
        board = ["-", "-", "-", "-", "-", "-", "-", "-", "-", "-"];
    }
    
    modifier requirePayment(){
        require(msg.value == 1 ether, "You have to pay 1 ether!");
        _;
    }

    modifier canYouPlay(){
        require(player1 != address(0) && player2 != address(0) && (player1 == msg.sender || player2 == msg.sender), 
                "Something went wrong, cannot play!");
        require(!isGameOver, "The game has ended!");
        _;
    }
    
    modifier canYouMakeMove(uint8 tile){
        require(tile > 0 && tile < 10 && keccak256(abi.encodePacked(board[tile-1]))==keccak256(abi.encodePacked('-')), 
            "Cannot play!");
        require(lastPlayed != msg.sender, "It is not your turn!");
        _;
    }
    
    modifier canCollectProfit(){
        require(owner == msg.sender, "You are not the owner");
        require(isGameOver, "Wait till the end of the game!");
        _;
    }
    
    modifier canCancel(){
        require(block.timestamp >= (startTime + 2 minutes) && player1 == msg.sender && player2 == address(0),  "Please wait before you quit!");
        require(!isGameOver, "You have cancelled the game!");
        _;
    }
    
    modifier canUr2Slow(){
        require(!isGameOver, "Game has ended!");
        require(player1 != address(0) && player2 != address(0), "Wait to start game!");
        require(block.timestamp >= (ur2slowTime + 1 minutes), "Please wait before you quit!");
        require(lastPlayed == msg.sender, "Wait for your turn!");
        _;
    }
    
    function play() public payable requirePayment {
        if(player1 == address(0)){
            player1 = msg.sender;
            startTime = block.timestamp;
            emit NewGame(player1, address(0));
        }else {
            require(player1 != address(0) && player2 == address(0) && player1 != msg.sender, "You cannot play with yourself!");
            player2 = msg.sender;
            emit NewGame(player1, player2);
        }
    }
    
    function placeS(uint8 tile) public canYouPlay{
        makeMove(tile, "S");
    }
    
    function placeO(uint8 tile) public canYouPlay{
        makeMove(tile, "O");
    }
    
    function getGameState() public view returns(string memory){
        return string(abi.encodePacked(board[0], board[1], board[2], board[3], board[4], board[5], board[6], board[7], board[8]));
    }
    
    function collectProfit() public canCollectProfit{
        emit CollectProfit(msg.sender, "You are the owner", owner, "You collected:", address(this).balance);
        owner.transfer(address(this).balance);
    }
    
    function cancel() public canCancel{
        msg.sender.transfer(1 ether);
        emit Resolution(msg.sender, "The game was cancelled by: ", player1, "You can have 1 ether back!");
        isGameOver = true;
        gameOverTime = block.timestamp;
    }
    
    function ur2slow() public canUr2Slow{
        lastPlayed.transfer(1.9 ether);
        if(lastMove == 1){
            emit MoveEvent(msg.sender, lastTile, 1);
        }else{
            emit MoveEvent(msg.sender, lastTile, 2);
        }
        emit Resolution(msg.sender, "Since the other player was too slow, you won:", lastPlayed, "Your reward is 1.9 ether");
        isGameOver = true;
        gameOverTime = block.timestamp;
    }
    
    function makeMove(uint8 tile, string memory symbol) internal canYouMakeMove(tile){
        board[tile-1] = symbol;
        lastPlayed = msg.sender;
        turn++;
        ur2slowTime = block.timestamp;
        
        if(keccak256(abi.encodePacked((symbol))) == keccak256(abi.encodePacked(("S")))){
            lastTile = tile;
            lastMove = 1;
            emit MoveEvent(msg.sender, tile, 1);   
        }else{
            lastTile = tile;
            lastMove = 2;
            emit MoveEvent(msg.sender, tile, 2);
        }
        
        checkIfWinner();
    }
    
    function checkIfWinner() internal {
        if(isWinner() && address(this).balance >= 1.8 ether){
            winner = msg.sender;
            winner.transfer(1.8 ether);
            isGameOver = true;
            gameOverTime = block.timestamp;
            emit Resolution(msg.sender, "Winner is: ", winner, "Reward is: 1.8 ether");
        }else if(!isWinner() && turn == 9 && address(this).balance >= 1.8 ether){
            player1.transfer(0.5 ether);
            player2.transfer(0.5 ether);
            isGameOver = true;
            gameOverTime = block.timestamp;
            emit Resolution(player1, "It is a tie", player2, "You can have back 0.5 ether!");
        }
    }
    
    function isWinner() internal returns (bool){
        uint8[3][8] memory winningConditions = [[0, 1, 2], [3, 4, 5], [6, 7, 8],
                                                [0, 3, 6], [1, 4, 7], [2, 5, 8],
                                                [0, 4, 8], [2, 4, 6]];
        for(uint8 i = 0; i < 8; i++){
            uint8[3] memory condition = winningConditions[i];
            if(keccak256(abi.encodePacked(board[condition[0]])) == keccak256(abi.encodePacked('S')) && 
                keccak256(abi.encodePacked(board[condition[1]])) == keccak256(abi.encodePacked('O')) &&
                keccak256(abi.encodePacked(board[condition[2]])) == keccak256(abi.encodePacked('S'))){
                isWin = true;
            }
        }
        return isWin;
    }
    
    function toOriginalState() public{
        if(isGameOver && block.timestamp >= (gameOverTime + 2 minutes)){
            player1 = address(0);
            player2 = address(0);
            winner = address(0);
            lastPlayed = address(0);
            board = ["-", "-", "-", "-", "-", "-", "-", "-", "-", "-"];
            startTime = 0;
            ur2slowTime = 0;
            gameOverTime = 0;
            turn = 0;
            lastMove = 0;
            lastTile = 0;
            isWin = false;
            isPlay = false;
            isGameOver = false;      
        }else{
           emit Error(msg.sender, "Wait 2 minutes after 'Game Over' before you return to original state");
        }
    }
}