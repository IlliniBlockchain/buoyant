import './App.css';
import logo from './squid_apple.png'
import {useState, useEffect} from 'react'

// phantom connect

// initialize - payee, amount, duration, starting amount (to deposit) - outputs subscription metadata address
// deposit - subscription address, amount
// withdraw - subscription address, amount
// renew - subscription address

// send subscription - subscription, person's normal account - creates associated + transfers
// show metadata - subscription address - outputs data
// check active - subscription address - outputs active status
// check owner - subscription address, owner - outputs owner status

function App() {

  const [ initData, setInitData ] = useState({
    payee: "",
    amount: "",
    duration: "",
    startingAmount: "",
  });

  const [ depositWithdrawData, setDepositWithdrawData ] = useState({
    subscriptionAddress: "",
    amount: "",
  });

  const [ renewData, setRenewData ] = useState({
    subscriptionAddress: "",
  });

  

  return (
    <div>

      <div class="title">
        <img class="logo" src={logo} />
        <h1 class="logo-text">Buoyant Demo App</h1>
      </div>

      <div className="App">

        <div class="left-box">

          <div class="left-input-box">

            <div class="initialize-box panel">
            </div>
            <div class="deposit-box panel">
            </div>
            <div class="withdraw-box panel">
            </div>
            <div class="renew-box panel">
            </div>

          </div>

          <div class="right-input-box">

          </div>

        </div>

        <div class="right-box">
        </div>

      </div>

    </div>
  );
}

export default App;
