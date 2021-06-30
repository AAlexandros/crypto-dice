const CryptoDice = artifacts.require("./CryptoDice_Antonov.sol")

contract("Deployment tests", () => {
	it("Should deploy smart contract properly", async() => {
		let cryptoDice = await CryptoDice.deployed();
		console.log(cryptoDice.address);
		assert(cryptoDice.address !== "")
	})
})