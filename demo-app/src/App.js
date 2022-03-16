import "./App.css";
import logo from "./squid_apple.png";
import loading from "./loading.svg";
import { useState, useEffect } from "react";

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
  const [inputData, setInputData] = useState({
    initialize: {
      payee: "",
      amount: "",
      duration: "",
      startAmount: "",
    },
    depositWithdraw: {
      subscriptionAddress: "",
      amount: "",
    },
    renew: {
      subscriptionAddress: "",
    },
  });

  const [buttonState, setButtonState] = useState({
    initialize: false,
    deposit: false,
    withdraw: false,
    renew: false,
  });

  function inputChange(event) {
    const [inputGroup, inputField] = event.target.name.split(".");
    const value = event.target.value;
    console.log(inputData);
    setInputData((values) => ({
      ...values,
      [inputGroup]: { ...values[inputGroup], [inputField]: value },
    }));
  }

  return (
    <div>
      <div className="title">
        <img className="logo" src={logo} />
        <h1 className="logo-text">Buoyant Demo App</h1>
      </div>

      <div className="App">
        <div className="left-box">
          <div className="left-input-box">
            <div className="initialize-box panel">
              <input
                name="initialize.payee"
                type="text"
                value={inputData.initialize.payee}
                onChange={inputChange}
                placeholder={"payee"}
              />
              <input
                name="initialize.amount"
                type="text"
                value={inputData.initialize.amount}
                onChange={inputChange}
                placeholder={"amount"}
              />
              <input
                name="initialize.duration"
                type="text"
                value={inputData.initialize.duration}
                onChange={inputChange}
                placeholder={"duration"}
              />
              <input
                name="initialize.startAmount"
                type="text"
                value={inputData.initialize.startAmount}
                onChange={inputChange}
                placeholder={"startAmount"}
              />
              <button>
                {buttonState.initialize ? (
                  <img className="loading" src={loading} />
                ) : (
                  "Create Subscription"
                )}
              </button>
            </div>

            <div className="deposit-box panel">
              <input
                name="depositWithdraw.amount"
                type="text"
                value={inputData.depositWithdraw.amount}
                onChange={inputChange}
                placeholder={"amount"}
              />
              <div className="two-btn-box">
                <button>
                  {buttonState.deposit ? (
                    <img className="loading" src={loading} />
                  ) : (
                    "Deposit"
                  )}
                </button>
                <button>
                  {buttonState.withdraw ? (
                    <img className="loading" src={loading} />
                  ) : (
                    "Withdraw"
                  )}
                </button>
              </div>
            </div>
            <div className="renew-box panel">
              <input
                name="renew.subscriptionAddress"
                type="text"
                value={inputData.renew.subscriptionAddress}
                onChange={inputChange}
                placeholder={"subscriptionAddress"}
              />
              <button>
                {buttonState.renew ? (
                  <img className="loading" src={loading} />
                ) : (
                  "Renew / Expire"
                )}
              </button>
            </div>
          </div>

          <div className="right-input-box"></div>
        </div>

        <div className="right-box"></div>
      </div>
    </div>
  );
}

export default App;
