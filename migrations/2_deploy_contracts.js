const CryptoDice = artifacts.require("CryptoDice");

module.exports = function(deployer) {
  deployer.deploy(CryptoDice);
};
