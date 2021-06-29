// SPDX-License-Identifier: UNLICENCED
pragma solidity 0.7.6;

contract CreateHash{
    
    function getHashString(string memory _string) public pure  returns(bytes32){
        return keccak256(abi.encodePacked(_string));
    }
    
    function getHashBytes(bytes32 _hash) public pure  returns(bytes32){
        return keccak256(abi.encodePacked(_hash));
    }
    
}
