import "./App.css";
import logo from "./squid_apple.png";
import loading from "./loading.svg";
import { useState, useEffect } from "react";
import {
  Connection,
  PublicKey,
  clusterApiUrl,
  Transaction,
} from "@solana/web3.js";
import { NATIVE_MINT } from "@solana/spl-token";
import { Provider } from "@project-serum/anchor";
import {
  getInitializeInstruction,
  getDepositInstruction,
  getRenewInstruction,
} from "./utils";
import ActionButton from "./ActionButton";

// phantom connect

// initialize - payee, amount, duration, mint, starting amount (to deposit) - outputs subscription metadata address
// deposit - subscription address, amount
// withdraw - subscription address, amount
// renew - subscription address

// send subscription - subscription, person's normal account - creates associated + transfers
// show metadata - subscription address - outputs subscription data, deposit vault balance
// check active - subscription address - outputs active status
// check owner - subscription address, owner - outputs owner status

const programId = new PublicKey("Fpwgc9Tq7k2nMzVxYqPWwKGA7FbCQwo2BgekpT69Cgbf");
const network = clusterApiUrl("devnet");
const opts = {
  preflightCommitment: "confirmed", // can also "finalized"
};

function App() {
  const [output, setOutput] = useState("");
  const [walletAddress, setWalletAddress] = useState(null);
  const [inputData, setInputData] = useState({
    initialize: {
      payee: "5PWsJe6h2kVEYPkdhhZZgftQfkPbkB3DTooQZR2AfkFb",
      amount: "",
      duration: "",
      depositMint: "9cMVucmpfyyuUGhN4KgtpS1NcFxcU18LL8KkycgnZnMM",
      startAmount: "",
    },
    depositWithdraw: {
      subscriptionAddress: "",
      amount: "",
    },
    renew: {
      subscriptionAddress: "",
    },
    sendOwner: {
      subscriptionAddress: "",
      newOwner: "",
    },
    metadataActive: {
      subscriptionAddress: "",
    },
  });

  const [buttonState, setButtonState] = useState({
    initialize: false,
    deposit: false,
    withdraw: false,
    renew: false,
    send: false,
    metadata: false,
    active: false,
    owner: false,
  });

  function inputChange(event) {
    const [inputGroup, inputField] = event.target.name.split(".");
    const value = event.target.value;
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
          console.log("Phantom wallet found!");
        }

        /*
         * The solana object gives us a function that will allow us to connect
         * directly with the user's wallet!
         */
        const response = await solana.connect({ onlyIfTrusted: true });
        console.log(
          "Connected with Public Key:",
          response.publicKey.toString()
        );

        /*
         * Set the user's publicKey in state to be used later!
         */
        setWalletAddress(response.publicKey.toString());
      } else {
        alert("Solana object not found! Get a Phantom Wallet 👻");
      }
    } catch (error) {
      console.error(error);
    }
  };

  const connectWallet = async () => {
    const { solana } = window;

    if (solana) {
      const response = await solana.connect();
      console.log("Connected with Public Key:", response.publicKey.toString());
      setWalletAddress(response.publicKey.toString());
    }
  };

  useEffect(() => {
    const onLoad = async () => {
      await checkIfWalletIsConnected();
    };
    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);

  const sendInit = async () => {
    setButtonState((values) => ({ ...values, initialize: true }));
    let { payee, amount, duration, depositMint, startAmount } =
      inputData.initialize;
    payee = new PublicKey(payee);
    amount = parseInt(amount);
    duration = parseInt(duration);
    depositMint = new PublicKey(depositMint);
    const { provider, connection } = getProvider();

    try {
      const ix = await getInitializeInstruction(
        connection,
        new PublicKey(walletAddress),
        payee,
        amount,
        duration,
        depositMint
      );
      console.log(ix);
      const tx = new Transaction({
        feePayer: new PublicKey(walletAddress),
        recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
      });
      tx.add(ix);
      const { signature } = await window.solana.signAndSendTransaction(tx);
      const response = await connection.confirmTransaction(signature);
      console.log(response);

      // console.log(`https://explorer.solana.com/tx/${txid}?cluster=devnet`);

      setOutput(
        <a
          href={
            "https://explorer.solana.com/tx/" + signature + "?cluster=devnet"
          }
          target="_blank"
        >
          Successful initialization. Link to transaction on explorer
        </a>
      );
      setButtonState((values) => ({ ...values, initialize: false }));
    } catch (err) {
      console.log(err);
      setOutput("Error occurred. Check browser logs.");
      setButtonState((values) => ({ ...values, initialize: false }));
    }
  };

  const sendDeposit = async () => {
    setButtonState((values) => ({ ...values, deposit: true }));
    let { subscriptionAddress, amount } = inputData.depositWithdraw;
    subscriptionAddress = new PublicKey(subscriptionAddress);
    amount = parseInt(amount);
    const { provider, connection } = getProvider();

    try {
      const ix = await getDepositInstruction(
        connection,
        new PublicKey(walletAddress),
        subscriptionAddress,
        amount
      );
      console.log(ix);
      const tx = new Transaction({
        feePayer: new PublicKey(walletAddress),
        recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
      });
      tx.add(ix);
      const { signature } = await window.solana.signAndSendTransaction(tx);
      const response = await connection.confirmTransaction(signature);
      console.log(response);

      setOutput(
        <a
          href={
            "https://explorer.solana.com/tx/" + signature + "?cluster=devnet"
          }
          target="_blank"
        >
          Successful deposit. Link to transaction on explorer
        </a>
      );
      setButtonState((values) => ({ ...values, deposit: false }));
    } catch (err) {
      console.log(err);
      setOutput("Error occurred. Check browser logs.");
      setButtonState((values) => ({ ...values, deposit: false }));
    }
  };

  const sendRenew = async () => {
    setButtonState((values) => ({ ...values, renew: true }));
    let { subscriptionAddress } = inputData.renew;
    subscriptionAddress = new PublicKey(subscriptionAddress);
    const { provider, connection } = getProvider();

    try {
      // can change subowner to be an optional argument, maybe another input
      const ix = await getRenewInstruction(
        connection,
        subscriptionAddress,
        new PublicKey(walletAddress),
        new PublicKey(walletAddress)
      );
      console.log(ix);
      const tx = new Transaction({
        feePayer: new PublicKey(walletAddress),
        recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
      });
      tx.add(ix);
      const { signature } = await window.solana.signAndSendTransaction(tx);
      const response = await connection.confirmTransaction(signature);
      console.log(response);

      setOutput(
        <a
          href={
            "https://explorer.solana.com/tx/" + signature + "?cluster=devnet"
          }
          target="_blank"
        >
          Successful renew. Link to transaction on explorer
        </a>
      );
      setButtonState((values) => ({ ...values, renew: false }));
    } catch (err) {
      console.log(err);
      setOutput("Error occurred. Check browser logs.");
      setButtonState((values) => ({ ...values, renew: false }));
    }
  };

  const sendSend = async () => {};

  const showOwner = async () => {};

  const showMetadata = async () => {};

  const showActive = async () => {};

  return (
    <div>
      <div className="top-bar">
        <div className="title">
          <img className="logo" src={logo} />
          <h1 className="logo-text">Buoyant Demo App</h1>
        </div>
        <div className="connect-box">
          {walletAddress === null ? (
            <ActionButton
              label={"Connect Wallet"}
              loading={false}
              clickHandler={connectWallet}
            />
          ) : (
            <h3 className="wallet-address">
              {walletAddress.slice(0, 4) +
                "..." +
                walletAddress.slice(-4, walletAddress.length)}
            </h3>
          )}
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
                name="initialize.depositMint"
                type="text"
                value={inputData.initialize.depositMint}
                onChange={inputChange}
                placeholder={"depositMint"}
              />
              <input
                name="initialize.startAmount"
                type="text"
                value={inputData.initialize.startAmount}
                onChange={inputChange}
                placeholder={"startAmount"}
              />
              <ActionButton
                label={"Create Subscription"}
                loading={buttonState.initialize}
                clickHandler={sendInit}
              />
            </div>

            <div className="deposit-box panel">
              <input
                name="depositWithdraw.subscriptionAddress"
                type="text"
                value={inputData.depositWithdraw.subscriptionAddress}
                onChange={inputChange}
                placeholder={"subscriptionAddress"}
              />
              <input
                name="depositWithdraw.amount"
                type="text"
                value={inputData.depositWithdraw.amount}
                onChange={inputChange}
                placeholder={"amount"}
              />
              <div className="two-btn-box">
                <ActionButton
                  label={"Deposit"}
                  loading={buttonState.deposit}
                  clickHandler={sendDeposit}
                />
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
              <ActionButton
                label={"Renew / Expire"}
                loading={buttonState.renew}
                clickHandler={sendRenew}
              />
            </div>
          </div>

          <div className="right-input-box">
            <div className="send-box panel">
              <input
                name="sendOwner.subscriptionAddress"
                type="text"
                value={inputData.sendOwner.subscriptionAddress}
                onChange={inputChange}
                placeholder={"subscriptionAddress"}
              />
              <input
                name="sendOwner.newOwner"
                type="text"
                value={inputData.sendOwner.newOwner}
                onChange={inputChange}
                placeholder={"newOwner"}
              />
              <div className="two-btn-box">
                <ActionButton
                  label={"Send"}
                  loading={buttonState.send}
                  clickHandler={sendSend}
                />
                <ActionButton
                  label={"Check Owner"}
                  loading={buttonState.owner}
                  clickHandler={showOwner}
                />
              </div>
            </div>

            <div className="metadata-box panel">
              <input
                name="metadataActive.subscriptionAddress"
                type="text"
                value={inputData.metadataActive.subscriptionAddress}
                onChange={inputChange}
                placeholder={"subscriptionAddress"}
              />
              <ActionButton
                label={"Show Metadata"}
                loading={buttonState.metadata}
                clickHandler={showMetadata}
              />
              <ActionButton
                label={"Show Active Status"}
                loading={buttonState.active}
                clickHandler={showActive}
              />
            </div>
          </div>
        </div>

        <div className="right-box">
          <p className="output">{output}</p>
        </div>
      </div>
    </div>
  );
}

export default App;
