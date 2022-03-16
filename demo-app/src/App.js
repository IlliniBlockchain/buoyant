import "./App.css";
import logo from "./squid_apple.png";
import loading from "./loading.svg";
import { useState, useEffect } from "react";
import { Connection, PublicKey, clusterApiUrl, Transaction } from "@solana/web3.js";
import { NATIVE_MINT } from "@solana/spl-token";
import { Provider } from "@project-serum/anchor";
import { getInitializeInstruction } from "./utils";

// phantom connect

// initialize - payee, amount, duration, starting amount (to deposit) - outputs subscription metadata address
// deposit - subscription address, amount
// withdraw - subscription address, amount
// renew - subscription address

// send subscription - subscription, person's normal account - creates associated + transfers
// show metadata - subscription address - outputs data
// check active - subscription address - outputs active status
// check owner - subscription address, owner - outputs owner status

const programId = new PublicKey("Fpwgc9Tq7k2nMzVxYqPWwKGA7FbCQwo2BgekpT69Cgbf");
const network = clusterApiUrl('devnet');
const opts = {
  preflightCommitment: "confirmed" // can also "finalized"
}

function App() {

  const [ output, setOutput ] = useState("");
  const [walletAddress, setWalletAddress] = useState(null);
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

  const getProvider = () => {
    const connection = new Connection(network, opts.preflightCommitment);
    const provider = new Provider(
      connection,
      window.solana,
      opts.preflightCommitment
    );
    return { provider, connection };
  };

  const checkIfWalletIsConnected = async () => {
    try {
      const { solana } = window;

      if (solana) {
        if (solana.isPhantom) {
          console.log('Phantom wallet found!');
        }

        /*
         * The solana object gives us a function that will allow us to connect
         * directly with the user's wallet!
         */
        const response = await solana.connect({ onlyIfTrusted: true });
        console.log(
          'Connected with Public Key:',
          response.publicKey.toString()
        );

        /*
           * Set the user's publicKey in state to be used later!
           */
        setWalletAddress(response.publicKey.toString());

      } else {
        alert('Solana object not found! Get a Phantom Wallet 👻');
      }
    } catch (error) {
      console.error(error);
    }
  };

  const connectWallet = async () => {
    const { solana } = window;

    if (solana) {
      const response = await solana.connect();
      console.log('Connected with Public Key:', response.publicKey.toString());
      setWalletAddress(response.publicKey.toString());
    }
  };

  useEffect(() => {
    const onLoad = async () => {
      await checkIfWalletIsConnected();
    };
    window.addEventListener('load', onLoad);
    return () => window.removeEventListener('load', onLoad);
  }, []);

  const sendInit = async () => {
    setButtonState((values) => ({...values, initialize: true}));
    let { payee, amount, duration } = inputData.initialize;
    payee = new PublicKey(payee);
    amount = parseInt(amount);
    duration = parseInt(duration);
    const { provider, connection } = getProvider();
    const ix = await getInitializeInstruction(
      connection,
      new PublicKey(walletAddress),
      payee,
      amount,
      duration,
      NATIVE_MINT
    );
    console.log(ix);
    const tx = new Transaction({
      feePayer: new PublicKey(walletAddress),
      recentBlockhash: (await connection.getLatestBlockhash()).blockhash
    });
    tx.add(ix);
    const { signature } = await window.solana.signAndSendTransaction(tx);
    const response = await connection.confirmTransaction(signature);
    console.log(response);

    // console.log(`https://explorer.solana.com/tx/${txid}?cluster=devnet`);
    
    setOutput("https://explorer.solana.com/tx/" + signature + "?cluster=devnet");
    setButtonState((values) => ({...values, initialize: false}));
  }

  return (
    <div>
      <div className="top-bar">
        <div className="title">
          <img className="logo" src={logo} />
          <h1 className="logo-text">Buoyant Demo App</h1>
        </div>
        <div className="connect-box">
          {
            walletAddress === null
            ?
            <button className="connect-btn" onClick={connectWallet}>Connect Wallet</button>
            :
            <h3 className="wallet-address">{walletAddress.slice(0, 4) + "..." + walletAddress.slice(-4, -1)}</h3>
          }
        </div>
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
              <button onClick={buttonState.initialize ? (() => {}) : sendInit}>
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

        <div className="right-box">
          <p className="output">{output}</p>
        </div>
      </div>
    </div>
  );
}

export default App;
