const CryptoSOS = artifacts.require("./CryptoSOS.sol")
const tryCatch = require("./Exceptions.js").tryCatch;
const BN = require("./bn.js");
const truffleAssert = require('truffle-assertions');

contract("Deployment tests", () => {
	it("Should deploy smart contract properly", async() => {
		let cryptoSOS = await CryptoSOS.deployed();
		console.log(cryptoSOS.address);
		assert(cryptoSOS.address !== "")
	})
})

/*
Testing Strategy of play() function:
	*All the tests, test that exacly 1 Ether is payed.
*/
contract("play() function test 1", accounts =>{

 	// This catches the error with message "You have already queued to play.".
	it("the play() function should not be able to be called twice by the same user.", async() => {
		let cryptoSOS = await CryptoSOS.deployed();
		await cryptoSOS.play.sendTransaction({from: accounts[0], value: web3.utils.toWei('1', 'ether')});
		await tryCatch(cryptoSOS.play.sendTransaction({from: accounts[0], value: web3.utils.toWei('1', 'ether')}));
	})
})

// This catches the error with message "The game has already started.".
contract("play() function test 2", accounts =>{

	it("The play() function should not be able to be called a third time.", async() => {
		let cryptoSOS = await CryptoSOS.deployed();
		await cryptoSOS.play.sendTransaction({from: accounts[0], value: web3.utils.toWei('1', 'ether')});
		await cryptoSOS.play.sendTransaction({from: accounts[1], value: web3.utils.toWei('1', 'ether')});
		await tryCatch(cryptoSOS.play.sendTransaction({from: accounts[2], value: web3.utils.toWei('1', 'ether')}));
	})
})

// This catches the error with message "The amount of Ether to participate should be 1 Ether.".
contract("play() function test 3", accounts =>{

	it("Exacly 1 Ether should be payed.", async() => {
		let cryptoSOS = await CryptoSOS.deployed();
		// More than one Ether is payed.
		await tryCatch(cryptoSOS.play.sendTransaction({from: accounts[0], value: web3.utils.toWei('2', 'ether')}));
		// Less than one Ether is payed.
	 	await tryCatch(cryptoSOS.play.sendTransaction({from: accounts[1], value: web3.utils.toWei('0.5', 'ether')}));
	 	// Exacly one Ether is payed.
	 	await cryptoSOS.play.sendTransaction({from: accounts[1], value: web3.utils.toWei('1', 'ether')});
	})
})

// Checks that an NewGame events are emitted and the correct addresses are in that event.
contract("play() function test 4", accounts =>{
	it("A NewGame event should be emmited with the correct addresses.", async() => {
		let cryptoSOS = await CryptoSOS.deployed();
		let firstPlay = await cryptoSOS.play.sendTransaction({from: accounts[0], value: web3.utils.toWei('1', 'ether')});
	    truffleAssert.eventEmitted(firstPlay, 'NewGame', (ev) => {
	      return true;
	    }, 'The users should be the correct ones.');

		let secondPlay = await cryptoSOS.play.sendTransaction({from: accounts[1], value: web3.utils.toWei('1', 'ether')});
	    truffleAssert.eventEmitted(secondPlay, 'NewGame', (ev) => {
	      return true;
	    }, 'The users should be the correct ones.');
	})
})

// Checks that the game state is consistent at the beginning of the game.
contract("getGameState() function test 1", accounts =>{
	it("The grid should have dashes for all of its squares at the beggining of the game.", async() => {
		let expectedGrid = "---------";
		let cryptoSOS = await CryptoSOS.deployed();
		let result = await cryptoSOS.getGameState.call();
		assert(result == expectedGrid);
	})
})

// This catches the errors with messages "".
contract("place() function test 1", accounts =>{

	it("A player that is not playing cannot place.", async() => {
		let cryptoSOS = await CryptoSOS.deployed();
	 	await cryptoSOS.play.sendTransaction({from: accounts[0], value: web3.utils.toWei('1', 'ether')});
	 	await cryptoSOS.play.sendTransaction({from: accounts[1], value: web3.utils.toWei('1', 'ether')});
	 	await tryCatch(cryptoSOS.placeS(1, {from: accounts[3]}));
	})

	it("A player plays without being his turn.", async() => {
		let cryptoSOS = await CryptoSOS.deployed();
		await cryptoSOS.placeS(1, {from: accounts[0]});
		await tryCatch(cryptoSOS.placeS(2, {from: accounts[0]}));
	})

	it("The correct player plays.", async() => {
		let cryptoSOS = await CryptoSOS.deployed();
		await cryptoSOS.placeS(2, {from: accounts[1]});
		await cryptoSOS.placeS(3, {from: accounts[0]});
	})
})

// This catches the errors with messages "".
contract("place() function test 2", accounts =>{

	it("A player plays a smaller value.", async() => {
		let cryptoSOS = await CryptoSOS.deployed();
	 	await cryptoSOS.play.sendTransaction({from: accounts[0], value: web3.utils.toWei('1', 'ether')});
	 	await cryptoSOS.play.sendTransaction({from: accounts[1], value: web3.utils.toWei('1', 'ether')});
		// Smaller value than expected.
		await tryCatch(cryptoSOS.placeS(0, {from: accounts[0]}));
	})

	it("A player plays a bigger value.", async() => {
		let cryptoSOS = await CryptoSOS.deployed();
		// Bigger value than expected.
		await tryCatch(cryptoSOS.placeS(10, {from: accounts[0]}));
	})
})

// This catches the errors with messages "".
contract("place() function test 3", accounts =>{

	it("A player places a symbol to an already full grid slot.", async() => {
		let cryptoSOS = await CryptoSOS.deployed();
	 	await cryptoSOS.play.sendTransaction({from: accounts[0], value: web3.utils.toWei('1', 'ether')});
	 	await cryptoSOS.play.sendTransaction({from: accounts[1], value: web3.utils.toWei('1', 'ether')});
		await cryptoSOS.placeS(1, {from: accounts[0]});
		await tryCatch(cryptoSOS.placeS(1, {from: accounts[1]}));
	})
})

// This catches the errors with messages "".
contract("place() function test 4", accounts =>{

	it("Checks that the board states are wright at each time-step.", async() => {
		let cryptoSOS = await CryptoSOS.deployed();
	 	await cryptoSOS.play.sendTransaction({from: accounts[0], value: web3.utils.toWei('1', 'ether')});
	 	await cryptoSOS.play.sendTransaction({from: accounts[1], value: web3.utils.toWei('1', 'ether')});
		let result = await cryptoSOS.getGameState.call();
		assert(result == "---------");

		await cryptoSOS.placeS(1, {from: accounts[0]});
		result = await cryptoSOS.getGameState.call();
		assert(result == "S--------");

		await cryptoSOS.placeO(4, {from: accounts[1]});
		result = await cryptoSOS.getGameState.call();
		assert(result == "S--O-----");


		await cryptoSOS.placeS(9, {from: accounts[0]});
		result = await cryptoSOS.getGameState.call();
		assert(result == "S--O----S");
	})
})

// This catches the errors with messages "".
contract("place() function test 5", accounts =>{

	it("Checks that the correct events are ommited at each step.", async() => {
		let cryptoSOS = await CryptoSOS.deployed();
	 	await cryptoSOS.play.sendTransaction({from: accounts[0], value: web3.utils.toWei('1', 'ether')});
	 	await cryptoSOS.play.sendTransaction({from: accounts[1], value: web3.utils.toWei('1', 'ether')});

	 	let action = await cryptoSOS.placeS(1, {from: accounts[0]});
	    truffleAssert.eventEmitted(action, 'MoveEvent', (ev) => {
	      return true;
	    }, 'The params should be the correct ones.');

	 	action = await cryptoSOS.placeO(4, {from: accounts[1]});
	    truffleAssert.eventEmitted(action, 'MoveEvent', (ev) => {
	      return true;
	    }, 'The params should be the correct ones.');

	 	action = await cryptoSOS.placeS(9, {from: accounts[0]});
	    truffleAssert.eventEmitted(action, 'MoveEvent', (ev) => {
	      return true;
	    }, 'The params should be the correct ones.');
	})
})

// This catches the errors with messages "".
contract("place() function test 6", accounts =>{

	it("Checks a horizontal case.", async() => {
		let cryptoSOS = await CryptoSOS.deployed();
	 	await cryptoSOS.play.sendTransaction({from: accounts[0], value: web3.utils.toWei('1', 'ether')});
	 	await cryptoSOS.play.sendTransaction({from: accounts[1], value: web3.utils.toWei('1', 'ether')});
	 	await cryptoSOS.placeS(1, {from: accounts[0]});
	 	await cryptoSOS.placeO(2, {from: accounts[1]});
	 	await cryptoSOS.placeS(3, {from: accounts[0]});
	})

	it("Checks a vertical case.", async() => {
		let cryptoSOS = await CryptoSOS.deployed();
	 	await cryptoSOS.play.sendTransaction({from: accounts[0], value: web3.utils.toWei('1', 'ether')});
	 	await cryptoSOS.play.sendTransaction({from: accounts[1], value: web3.utils.toWei('1', 'ether')});
	 	await cryptoSOS.placeS(3, {from: accounts[0]});
	 	await cryptoSOS.placeO(6, {from: accounts[1]});
	 	await cryptoSOS.placeS(9, {from: accounts[0]});
	})

	it("Checks a diagonal case.", async() => {
		let cryptoSOS = await CryptoSOS.deployed();
	 	await cryptoSOS.play.sendTransaction({from: accounts[0], value: web3.utils.toWei('1', 'ether')});
	 	await cryptoSOS.play.sendTransaction({from: accounts[1], value: web3.utils.toWei('1', 'ether')});
	 	await cryptoSOS.placeS(3, {from: accounts[0]});
	 	await cryptoSOS.placeO(5, {from: accounts[1]});
	 	await cryptoSOS.placeS(7, {from: accounts[0]});
	})

	it("Checks a cross case.", async() => {
		let cryptoSOS = await CryptoSOS.deployed();
		await cryptoSOS.play.sendTransaction({from: accounts[0], value: web3.utils.toWei('1', 'ether')});
	 	await cryptoSOS.play.sendTransaction({from: accounts[1], value: web3.utils.toWei('1', 'ether')});
	 	await cryptoSOS.placeS(4, {from: accounts[0]});
	 	await cryptoSOS.placeO(5, {from: accounts[1]});
	 	await cryptoSOS.placeS(6, {from: accounts[0]});
	})

	it("After all the tests, a game should be initiallized successfully.", async() => {
		let cryptoSOS = await CryptoSOS.deployed();
		await cryptoSOS.play.sendTransaction({from: accounts[0], value: web3.utils.toWei('1', 'ether')});
	 	await cryptoSOS.play.sendTransaction({from: accounts[1], value: web3.utils.toWei('1', 'ether')});
	 	await cryptoSOS.placeS(4, {from: accounts[0]});
	})
	
})

// This catches the errors with messages "".
contract("When the game ends, the balances are correct.", accounts =>{

	it("In this scenario, the first player wins, so its balance should increase. Because of gas costs the oposite goes for the second player.", async() => {
		let cryptoSOS = await CryptoSOS.deployed();
	 	await cryptoSOS.play.sendTransaction({from: accounts[0], value: web3.utils.toWei('1', 'ether')});
	 	await cryptoSOS.play.sendTransaction({from: accounts[1], value: web3.utils.toWei('1', 'ether')});
	 	let firstPlayerStartingBalance = await web3.eth.getBalance(accounts[0]);
	 	let secondPlayerStartingBalance = await web3.eth.getBalance(accounts[1]);

		await cryptoSOS.placeS(1, {from: accounts[0]});
		await cryptoSOS.placeO(5, {from: accounts[1]});
		await cryptoSOS.placeS(9, {from: accounts[0]});

		assert.isAbove(parseInt(await web3.eth.getBalance(accounts[0])), parseInt(firstPlayerStartingBalance), "Balance of first player is incorrect.");
		assert.isBelow(parseInt(await web3.eth.getBalance(accounts[1])), parseInt(secondPlayerStartingBalance), "Balance of second player is incorrect.");
	})

	it("In this scenario, the second player wins, so its balance should increase. Because of gas costs the oposite goes for the first player. Additionally, checks that a new game can be started", async() => {
		let cryptoSOS = await CryptoSOS.deployed();
	 	await cryptoSOS.play.sendTransaction({from: accounts[0], value: web3.utils.toWei('1', 'ether')});
	 	await cryptoSOS.play.sendTransaction({from: accounts[1], value: web3.utils.toWei('1', 'ether')});
	 	let firstPlayerStartingBalance = await web3.eth.getBalance(accounts[0]);
	 	let secondPlayerStartingBalance = await web3.eth.getBalance(accounts[1]);

		await cryptoSOS.placeS(1, {from: accounts[0]});
		await cryptoSOS.placeO(4, {from: accounts[1]});
		await cryptoSOS.placeS(9, {from: accounts[0]});
		await cryptoSOS.placeS(7, {from: accounts[1]});

		assert.isBelow(parseInt(await web3.eth.getBalance(accounts[0])), parseInt(firstPlayerStartingBalance), "Balance of first player is incorrect.");
		assert.isAbove(parseInt(await web3.eth.getBalance(accounts[1])), parseInt(secondPlayerStartingBalance), "Balance of second player is incorrect.");
	})

	it("In case of a draw, both players have lost money but the took some money back as well.", async() => {
		let cryptoSOS = await CryptoSOS.deployed();
	 	let firstPlayerStartingBalance = await web3.eth.getBalance(accounts[0]);
	 	let secondPlayerStartingBalance = await web3.eth.getBalance(accounts[1]);
	 	await cryptoSOS.play.sendTransaction({from: accounts[0], value: web3.utils.toWei('1', 'ether')});
	 	await cryptoSOS.play.sendTransaction({from: accounts[1], value: web3.utils.toWei('1', 'ether')});

		await cryptoSOS.placeS(1, {from: accounts[0]});
		await cryptoSOS.placeS(2, {from: accounts[1]});
		await cryptoSOS.placeS(3, {from: accounts[0]});
		await cryptoSOS.placeS(4, {from: accounts[1]});
		await cryptoSOS.placeS(5, {from: accounts[0]});
		await cryptoSOS.placeS(6, {from: accounts[1]});
		await cryptoSOS.placeS(7, {from: accounts[0]});
		await cryptoSOS.placeS(8, {from: accounts[1]});
	 	let firstPlayerBeforeTie = await web3.eth.getBalance(accounts[0]);
	 	let secondPlayerBeforeTie = await web3.eth.getBalance(accounts[1]);

		await cryptoSOS.placeS(9, {from: accounts[0]});
	 	let firstPlayerAfterTie = await web3.eth.getBalance(accounts[0]);
	 	let secondPlayerAfterTie = await web3.eth.getBalance(accounts[1]);

		assert.isBelow(parseInt(firstPlayerAfterTie), parseInt(firstPlayerStartingBalance), "The first player lost some money from the fee.");
		assert.isBelow(parseInt(secondPlayerAfterTie), parseInt(secondPlayerStartingBalance), "The second player lost some money from the fee.");
		assert.isAbove(parseInt(firstPlayerAfterTie), parseInt(firstPlayerBeforeTie), "The first player got some money back tho.");
		assert.isAbove(parseInt(secondPlayerAfterTie), parseInt(secondPlayerBeforeTie), "The second player got some money back tho.");
	})

	it("The game continues normaly after a draw. Both accounts are the correst ones.", async() => {
		let cryptoSOS = await CryptoSOS.deployed();
	 	await cryptoSOS.play.sendTransaction({from: accounts[2], value: web3.utils.toWei('1', 'ether')});
	 	let secondPlay = await cryptoSOS.play.sendTransaction({from: accounts[3], value: web3.utils.toWei('1', 'ether')});
	    truffleAssert.eventEmitted(secondPlay, 'NewGame', (ev) => {
	      return true;
	    }, 'The users should be the correct ones.');

		await cryptoSOS.placeS(1, {from: accounts[2]});
		await cryptoSOS.placeO(4, {from: accounts[3]});
		await cryptoSOS.placeS(9, {from: accounts[2]});
		await cryptoSOS.placeS(7, {from: accounts[3]});
	})
})

// This catches the errors with messages "".
contract("collectProfit() function test 1", accounts =>{

	it("Only the owner can call the collectProfit function.", async() => {
		let cryptoSOS = await CryptoSOS.deployed({ from: accounts[0]});
	 	await cryptoSOS.collectProfit({from: accounts[0]});
	 	await tryCatch(cryptoSOS.collectProfit({from: accounts[1]}));
	})
})

// This catches the errors with messages "".
contract("collectProfit() function test 2", accounts =>{

	it("The owner has not earned a profit yet because the game has not ended.", async() => {
		let cryptoSOS = await CryptoSOS.deployed({ from: accounts[0]});
		await cryptoSOS.play.sendTransaction({from: accounts[1], value: web3.utils.toWei('1', 'ether')});
	 	await cryptoSOS.play.sendTransaction({from: accounts[2], value: web3.utils.toWei('1', 'ether')});

		let balanceBeforeCollecting = await web3.eth.getBalance(accounts[0]);

		await cryptoSOS.placeS(1, {from: accounts[1]});
		await cryptoSOS.placeO(5, {from: accounts[2]});

		await cryptoSOS.collectProfit({from: accounts[0]});
		let balanceAfterCollecting = await web3.eth.getBalance(accounts[0]);

		assert.isAbove(parseInt(balanceBeforeCollecting), parseInt(balanceAfterCollecting), "The balance should decrease because of gas loss.");
	})

	it("The owner gets a profit as the game ends.", async() => {
		let cryptoSOS = await CryptoSOS.deployed({ from: accounts[0]});

		let balanceBeforeCollecting = await web3.eth.getBalance(accounts[0]);

		await cryptoSOS.placeS(9, {from: accounts[1]});

		await cryptoSOS.collectProfit({from: accounts[0]});
		let balanceAfterCollecting = await web3.eth.getBalance(accounts[0]);

		assert.isBelow(parseInt(balanceBeforeCollecting), parseInt(balanceAfterCollecting), "The balance should increase because the game ended.");
	})
})

// This catches the errors with messages "".
contract("cancel() function test 1", accounts =>{

	it("Cancel cannot be called before two minutes have passed.", async() => {
		let cryptoSOS = await CryptoSOS.deployed();
		await cryptoSOS.play.sendTransaction({from: accounts[0], value: web3.utils.toWei('1', 'ether')});

	 	await tryCatch(cryptoSOS.cancel({from: accounts[0]}));
	})

	it("The function cancel() cannot be called if two players are in the game.", async() => {
		let cryptoSOS = await CryptoSOS.deployed();
		await cryptoSOS.play.sendTransaction({from: accounts[1], value: web3.utils.toWei('1', 'ether')});

	 	await tryCatch(cryptoSOS.cancel({from: accounts[1]}));
	})
})

// This catches the errors with messages "".
contract("cancel() function test 2", accounts =>{

	it("A valid call of the cancel function.", async() => {
		let cryptoSOS = await CryptoSOS.deployed();
		await cryptoSOS.play.sendTransaction({from: accounts[0], value: web3.utils.toWei('1', 'ether')});
		await timeTravel(121);

	 	await cryptoSOS.cancel({from: accounts[0]});
	})
})

// This catches the errors with messages "".
contract("ur2slow() function test 1", accounts =>{

	it("The player cannot call the ur2slow function if it is his turn to play.", async() => {
		let cryptoSOS = await CryptoSOS.deployed();
		await cryptoSOS.play.sendTransaction({from: accounts[0], value: web3.utils.toWei('1', 'ether')});
		await cryptoSOS.play.sendTransaction({from: accounts[1], value: web3.utils.toWei('1', 'ether')});

	 	await tryCatch(cryptoSOS.ur2slow({from: accounts[0]}));
	})

	it("The player must wait 1 minute to be able to call the ur2slow function.", async() => {
		let cryptoSOS = await CryptoSOS.deployed();

	 	await tryCatch(cryptoSOS.ur2slow({from: accounts[1]}));
	})

	it("A successful ur2slow, which emmites an event.", async() => {
		let cryptoSOS = await CryptoSOS.deployed();

		await timeTravel(61);

		let secondPlay = await cryptoSOS.ur2slow({from: accounts[1]});
	    truffleAssert.eventEmitted(secondPlay, 'MoveEvent', (ev) => {
		      return true;
	    }, 'The params should be the correct ones.');
	})
})

// // This catches the errors with messages "".
// contract("gameExpired() function test 1", accounts =>{

// 	it("Five minutes should pass before the game can be expired. We check that the owner does not collect any profit at this case", async() => {
// 		let cryptoSOS = await CryptoSOS.deployed({ from: accounts[0]});

// 		let ownerStartingBalance = await web3.eth.getBalance(accounts[0]);
// 		await cryptoSOS.play.sendTransaction({from: accounts[1], value: web3.utils.toWei('1', 'ether')});
// 		await cryptoSOS.play.sendTransaction({from: accounts[2], value: web3.utils.toWei('1', 'ether')});

// 		await timeTravel(60);

// 	 	await tryCatch(cryptoSOS.gameExpired({from: accounts[0]}));
// 	 	await cryptoSOS.collectProfit({from: accounts[0]});

// 	 	let ownerEndingBalance = await web3.eth.getBalance(accounts[0]);
// 	 	assert.isBelow(parseInt(ownerEndingBalance), parseInt(ownerStartingBalance), "The owner shouldn't have collected any profit.");
// 	})
// })

// // This catches the errors with messages "".
// contract("gameExpired() function test 2", accounts =>{

// 	it("A game can not be expired if it has not started yet.", async() => {
// 		let cryptoSOS = await CryptoSOS.deployed({ from: accounts[0]});
// 		await cryptoSOS.play.sendTransaction({from: accounts[0], value: web3.utils.toWei('1', 'ether')});

// 		await timeTravel(301);

// 		await tryCatch(cryptoSOS.gameExpired({from: accounts[0]}));
// 	})
// })
// // This catches the errors with messages "".
// contract("gameExpired() function test 3", accounts =>{

// 	it("A valid gameExpired call.", async() => {
// 		let cryptoSOS = await CryptoSOS.deployed({ from: accounts[0]});
// 		await cryptoSOS.play.sendTransaction({from: accounts[0], value: web3.utils.toWei('1', 'ether')});
// 		await cryptoSOS.play.sendTransaction({from: accounts[1], value: web3.utils.toWei('1', 'ether')});

// 		await timeTravel(301);

// 		await cryptoSOS.gameExpired({from: accounts[0]});
// 	})
// })

// // This catches the errors with messages "".
// contract("gameExpired() function test 4", accounts =>{

// 	it("Only the owner can call the gameExpired function.", async() => {
// 		let cryptoSOS = await CryptoSOS.deployed({ from: accounts[0]});
// 		await cryptoSOS.play.sendTransaction({from: accounts[0], value: web3.utils.toWei('1', 'ether')});
// 		await cryptoSOS.play.sendTransaction({from: accounts[1], value: web3.utils.toWei('1', 'ether')});

// 		await timeTravel(301);

// 		await tryCatch(cryptoSOS.gameExpired({from: accounts[1]}));
// 	})
// })

// //This catches the errors with messages "".
// contract("gameExpired() function test 5", accounts =>{

// 	it("Only the owner gets payed if the gameExpired function is called.", async() => {
// 		let cryptoSOS = await CryptoSOS.deployed({ from: accounts[0]});

// 	 	let firstPlayerStartingBalance = await web3.eth.getBalance(accounts[1]);
// 	 	let secondPlayerStartingBalance = await web3.eth.getBalance(accounts[2]);
// 		let ownerStartingBalance = await web3.eth.getBalance(accounts[0]);

// 		await cryptoSOS.play.sendTransaction({from: accounts[1], value: web3.utils.toWei('1', 'ether')});
// 		await cryptoSOS.play.sendTransaction({from: accounts[2], value: web3.utils.toWei('1', 'ether')});

// 		await timeTravel(301);

// 		await cryptoSOS.gameExpired({from: accounts[0]})

// 		await cryptoSOS.collectProfit({from: accounts[0]});

// 	 	let firstPlayerBalanceAfterExpired = await web3.eth.getBalance(accounts[1]);
// 	 	let secondPlayerBalanceAfterExpired = await web3.eth.getBalance(accounts[2]);
// 		let ownerPlayerBalanceAfterExpired = await web3.eth.getBalance(accounts[0]);

// 		assert.isBelow(parseInt(firstPlayerBalanceAfterExpired), parseInt(firstPlayerStartingBalance), "The first player lost some money from the fee.");
// 		assert.isBelow(parseInt(secondPlayerBalanceAfterExpired), parseInt(secondPlayerStartingBalance), "The second player lost some money from the fee.");
// 		assert.isAbove(parseInt(ownerPlayerBalanceAfterExpired), parseInt(ownerStartingBalance), "The owner got all the money from the two players.");
// 	})
// })

const timeTravel = function (time) {
 return new Promise((resolve, reject) => {
   web3.currentProvider.send({
     jsonrpc: "2.0",
     method: "evm_increaseTime",
     params: [time], // 86400 is num seconds in day
     id: new Date().getTime()
   }, (err, result) => {
     if(err){ return reject(err) }
     return resolve(result)
   });
 })
}