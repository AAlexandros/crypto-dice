import React, { Component } from 'react';
import Web3 from 'web3'
import './App.css';
import CryptoDice from '../objects/CryptoDice.json'
import grid from '../grid.png'

const SYMBOL_BLANK = 0
const SYMBOL_ARRAY = {0 : '/images/dice_blank.png', 1 : '/images/dice_1.png', 2 : '/images/dice_2.png',
  3 : '/images/dice_3.png', 4 : '/images/dice_4.png', 5 : '/images/dice_5.png', 6 : '/images/dice_6.png' }

const BUTTON_COMMIT_SEED = 'Commit your initial seed'

const GRID_LABEL_DEFAULT = 'Dice Grid'

const EMPTY_ADDRESS = '0x0000000000000000000000000000000000000000'

class App extends Component {

    constructor(props) {
    super(props)
    this.state = {
      contract : null,
      activeSymbolArray: [],
      contractAddress: 0,
      userAddress: 0,
      ipAddress: '',
      portNumber: '',
      inGame: false,
      condfiguringContract: true,
      waitingInLobby: false,
      gameResult: 0,
      gameEnded: false,
      isFirstPlayer: true,
      seed: '',
      hashedSeed: ''
    }
    this.handleContractAddressChange = this.handleContractAddressChange.bind(this)
    this.handleUserAddressChange = this.handleUserAddressChange.bind(this)
    this.handleIpAddressChange = this.handleIpAddressChange.bind(this)
    this.handlePortNumberChange = this.handlePortNumberChange.bind(this)
    this.handleSubmit = this.handleSubmit.bind(this)
    this.handleHashedSeedChange = this.handleHashedSeedChange.bind(this)
    this.handleSeedChange = this.handleSeedChange.bind(this)
  }

  async componentWillMount() {
     this.setState({  contractAddress: 0 })
     this.setState({ activeSymbolArray: this.createBlankArray() })
  }

  createBlankArray() {
    var arr = [];
    var i;
    for(i=0 ; i<2 ; i++){
      arr.push(SYMBOL_BLANK);
    }
    return arr
  }

  async handleSubmit(event) {
    event.preventDefault();
    const web3 = new Web3('ws://' + this.state.ipAddress + ':' + this.state.portNumber)
    var abi = CryptoDice.abi
    var callingContract = web3.eth.Contract(abi, this.state.contractAddress)

    this.setState({contract: callingContract})

    callingContract.events.NewGame({})
    .on('data', (event) => { this.handleNewGameEvent(event)});

    callingContract.events.DiceReveal({})
    .on('data', (event) => { this.handleDiceRevealEvent(event)});

    await callingContract.methods.play(this.state.hashedSeed).send({from: this.state.userAddress, value: web3.utils.toWei('1', 'ether'), gas:3000000});
    this.setState({condfiguringContract: false})
    this.setState({waitingInLobby: true})
  }

  async handleCancel(){
    const contract = this.state.contract
    try{
      await contract.methods.cancel().send({from: this.state.userAddress, gas:3000000});
      window.location.reload(true)
    }
    catch (err) {
      alert('Failed to cancel. Maybe 2 minutes have not passed.')
      console.error(err)
    }
  }

  async handleEndOfTime(){
    const contract = this.state.contract
    try{
      await contract.methods.endOfTime().send({from: this.state.userAddress, gas:3000000});
      window.location.reload(true)
    }
    catch (err) {
      alert('Failed to call endOfTime. Maybe 1 minute has not passed.')
      console.error(err)
    }
  }

  async handleCommit(){
    alert('Waiting for the result...')
    const contract = this.state.contract
    await contract.methods.revealDice(this.state.seed).send({from: this.state.userAddress, gas:3000000})
    this.setState(this.state);
  }

  async handleNewGameEvent(event) {
    if (event.returnValues._firstPlayer===this.state.userAddress || event.returnValues._secondPlayer===this.state.userAddress) {
      if (event.returnValues._firstPlayer===this.state.userAddress) {
        this.setState({isFirstPlayer : true})
      }
      else{
        this.setState({isFirstPlayer : false})
      }
      if (event.returnValues._secondPlayer===EMPTY_ADDRESS) {
        this.setState({condfiguringContract : false})
        this.setState({waitingInLobby : true})
        this.setState({playing : false})
      }
      else {
        this.setState({condfiguringContract : false})
        this.setState({waitingInLobby : false})
        this.setState({playing : true})
      }
    }
  }

  async handleDiceRevealEvent(event) {
    if (this.state.isFirstPlayer===true && event.returnValues._firstDie!==0
      && event.returnValues._secondDie===0) {
      alert ('You won by calling endOfTime.')
      this.setState({ gameEnded: true })
      this.setState({ gameResult: 1 })
      this.setEndgame()
      return
    }
    else if (this.state.isFirstPlayer===true && event.returnValues._firstDie===0
        && event.returnValues._secondDie!==0) {
      alert ('You lost by a called endOfTime.!')
      this.setState({ gameEnded: true })
      this.setState({ gameResult: 2 })
      this.setEndgame()
      return
    }

    const arr = [];
    arr.push(event.returnValues._firstDie);
    arr.push(event.returnValues._secondDie);
    this.setState({ activeSymbolArray: arr })

    if (event.returnValues._firstDie===event.returnValues._secondDie){
      alert('The game has ended with a draw!')
      this.setState({ gameEnded: true })
      this.setState({ gameResult: 3 })
      this.setEndgame()
    }
    else if ((this.state.isFirstPlayer && event.returnValues._firstDie>event.returnValues._secondDie)
        || (!this.state.isFirstPlayer && event.returnValues._firstDie<event.returnValues._secondDie)) {
      alert('The game has ended, you won!')
      this.setState({ gameEnded: true })
      this.setState({ gameResult: 1 })
      this.setEndgame()
    }
    else {
      alert('The game has ended, you lost!')
      this.setState({ gameEnded: true })
      this.setState({ gameResult: 2 })
      this.setEndgame()
    }
  }

  setEndgame () {
    this.setState({inGame: false, condfiguringContract: false, waitingInLobby: false, playing: false, gameEnded: true})
  }

  Config() {
    return (
      <form onSubmit={this.handleSubmit}>
        <div className="form-row">
          <div className="form-group col-md-12">
            <label htmlFor="inputHashSeed">Commit a hashed seed</label>
            <input type="text" className="form-control" id="inputHashSeed" placeholder="Hash of seed" value={this.state.hashedSeed} onChange={this.handleHashedSeedChange}/>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group col-md-6">
            <label htmlFor="inputContractAddress">Smart contract address</label>
            <input type="text" className="form-control" id="inputContractAddress" placeholder="Contract address" value={this.state.contractAddress} onChange={this.handleContractAddressChange}/>
          </div>
          <div className="form-group col-md-6">
            <label htmlFor="inputUserAddress">User address</label>
            <input type="text" className="form-control" id="inputUserAddress" placeholder="User address" value={this.state.userAddress} onChange={this.handleUserAddressChange}/>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group col-md-6">
            <label htmlFor="ipAddress">Ip address</label>
            <input type="text" className="form-control" id="ipAddress" placeholder="IP address" value={this.state.ipAddress} onChange={this.handleIpAddressChange}/>
          </div>
          <div className="form-group col-md-6">
            <label htmlFor="portNumber">Port number</label>
            <input type="text" className="form-control" id="portNumber" placeholder="Port number" alue={this.state.portNumber} onChange={this.handlePortNumberChange}/>
          </div>
        </div>
        <button type="submit" className="btn btn-primary">Play</button>
      </form>
      )
  }

  Wait() {
    return (
      <div className="jumbotron">
        <p>Waiting in lobby ...</p>
        <button className="btn btn-primary" onClick={() => this.handleCancel()}>Cancel</button>
      </div>
    )
  }

  Play() {
    return (
      <div className="container">
        <p>{ BUTTON_COMMIT_SEED }</p>
        <div className="input-group mb-3">
          <input type="text" className="form-control" placeholder=""
                 aria-label="" aria-describedby="basic-addon2" value={this.state.seed} onChange={this.handleSeedChange}/>
            <div className="input-group-append">
              <button className="btn btn-outline-secondary" type="button" onClick={() => this.handleCommit()}>Commit</button>
            </div>
        </div>


        <p>Additional actions</p>
        <div><button type="button" className="btn btn-secondary" onClick={() => this.handleEndOfTime()}>Win on time</button></div>
      </div>
    )
  }

  End() {
    var message
    switch (this.state.gameResult) {
      case 1:
        message = "You won!"
        break
      case 2:
        message = "You lost!"
        break
      case 3:
        message = "The game ended with a tie!"
    }
    return (
      <div className="jumbotron">
        <h1>{message}</h1>
      </div>
    )
  }

  BoardBox(index) {
    var symbolString = this.state.activeSymbolArray[index]
    var symbolImageUrl = SYMBOL_ARRAY[symbolString]
    var image = window.location.origin + symbolImageUrl
    //var newImageArray = update(this.state.symbolArray, { [index]: {$set: SYMBOL_SHINY} })
    return (
     <div className="col-6"><img key={index}  src={image} data-id={index}/></div>
    )
  }

  handleContractAddressChange(event) {
    this.setState({contractAddress: event.target.value});
  }

  handleUserAddressChange(event) {
    this.setState({userAddress: event.target.value});
  }

  handleIpAddressChange(event) {
    this.setState({ipAddress: event.target.value});
  }

  handlePortNumberChange(event) {
    this.setState({portNumber: event.target.value});
  }

  handleHashedSeedChange(event) {
      this.setState({hashedSeed: event.target.value})
  }

  handleSeedChange(event) {
      this.setState({seed: event.target.value})
  }

  render() {
    return (
      <div>
        <nav className="navbar navbar-dark fixed-top bg-dark flex-md-nowrap p-0 shadow">
          <a
            className="navbar-brand col-sm-3 col-md-2 mr-0"
            target="_blank"
            rel="noopener noreferrer"
          >
          <img src={grid} width="30" height="30" className="d-inline-block align-top" alt="" />
          </a>
          <ul className="navbar-nav px-3">
            <li className="nav-item text-nowrap d-none d-sm-none d-sm-block">
              <small className="text-muted"><span id="account"></span></small>
            </li>
          </ul>
        </nav>
        <div className="container-fluid mt-5">
          <div className="row">
            <main role="main" className="col-lg-12 d-flex text-center">
              <div className="content mr-auto ml-auto">
                <h1 className="d-4">{ GRID_LABEL_DEFAULT }</h1>

                <div className="container">
                  <div>
                  <div className="row">
                  {this.BoardBox(0)}
                  {this.BoardBox(1)}
                  </div>
                  </div>

                  { this.state.condfiguringContract ? this.Config() : null }
                  { this.state.waitingInLobby ? this.Wait() : null }
                  { this.state.playing ? this.Play() : null }
                  { this.state.gameEnded ? this.End() : null }
                </div>

              </div>

            </main>
          </div>
        </div>
      </div>
    );
  }
}

export default App;
