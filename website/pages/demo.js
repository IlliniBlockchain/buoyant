import Head from "next/head";
import Image from "next/image";
import styles from "../styles/Demo.module.css";

import { useState, useEffect } from "react";
import {
  Connection,
  PublicKey,
  clusterApiUrl,
  Transaction,
} from "@solana/web3.js";
import { Provider } from "@project-serum/anchor";
import {
  getInitializeInstruction,
  getDepositInstruction,
  getRenewInstruction,
  unpackSubscription,
  findTokenHolder,
  getCreateAtaInstruction,
  getSendInstruction,
  getSubscriptionKey,
} from "../utils/utils";
import ActionButton from "../components/ActionButton";

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

export default function Demo() {
  const [showPopup, setShowPopup] = useState(true);

  const [output, setOutput] = useState("");
  const [walletAddress, setWalletAddress] = useState(null);
  const [inputData, setInputData] = useState({
    initialize: {
      payee: "",
      amount: "",
      duration: "",
      depositMint: "",
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
      const subscriptionAddress = await getSubscriptionKey(
        connection,
        payee,
        amount,
        duration
      );

      setOutput(
        <>
          <a
            href={
              "https://explorer.solana.com/tx/" + signature + "?cluster=devnet"
            }
            target="_blank"
            rel="noreferrer"
          >
            Successful initialization. Link to transaction on explorer
          </a>
          <p>Subscription address: {subscriptionAddress.toBase58()}</p>
        </>
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
          rel="noreferrer"
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
          rel="noreferrer"
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

  const sendSend = async () => {
    setButtonState((values) => ({ ...values, send: true }));
    let { subscriptionAddress, newOwner } = inputData.sendOwner;
    subscriptionAddress = new PublicKey(subscriptionAddress);
    newOwner = new PublicKey(newOwner);
    const { provider, connection } = getProvider();

    try {
      const createIx = await getCreateAtaInstruction(
        connection,
        subscriptionAddress,
        newOwner,
        new PublicKey(walletAddress)
      );
      const sendIx = await getSendInstruction(
        connection,
        subscriptionAddress,
        newOwner,
        new PublicKey(walletAddress)
      );

      const tx = new Transaction({
        feePayer: new PublicKey(walletAddress),
        recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
      });

      tx.add(createIx).add(sendIx);
      const { signature } = await window.solana.signAndSendTransaction(tx);
      const response = await connection.confirmTransaction(signature);
      console.log(response);

      setOutput(
        <a
          href={
            "https://explorer.solana.com/tx/" + signature + "?cluster=devnet"
          }
          target="_blank"
          rel="noreferrer"
        >
          Successful send. Link to transaction on explorer
        </a>
      );
      setButtonState((values) => ({ ...values, send: false }));
    } catch (err) {
      console.log(err);
      setOutput("Error occurred. Check browser logs.");
      setButtonState((values) => ({ ...values, send: false }));
    }
  };

  const showOwner = async () => {
    setButtonState((values) => ({ ...values, owner: true }));
    let { subscriptionAddress, newOwner } = inputData.sendOwner;

    try {
      subscriptionAddress = new PublicKey(subscriptionAddress);
      newOwner = new PublicKey(newOwner);
      const { provider, connection } = getProvider();

      const subAccount = await connection.getAccountInfo(subscriptionAddress);
      const subData = unpackSubscription(subAccount.data);
      const { mint } = subData;
      let output = <h3>No owner.</h3>;
      if (mint != null) {
        const tokenHolder = await findTokenHolder(connection, mint);
        output = (
          <>
            <h3>Address input is not owner.</h3>
            <p>Owner: {tokenHolder.toBase58()}</p>
          </>
        );
        if (newOwner.toBase58() == tokenHolder.toBase58()) {
          output = (
            <>
              <h3>Address input is owner.</h3>
              <p>Owner: {tokenHolder.toBase58()}</p>
            </>
          );
        }
      }

      setOutput(output);
      setButtonState((values) => ({ ...values, owner: false }));
    } catch (err) {
      console.log(err);
      setOutput(
        "Subscription expired, invalid inputs, or other error occurred. Check browser logs."
      );
      setButtonState((values) => ({ ...values, owner: false }));
    }
  };

  const showMetadata = async () => {
    setButtonState((values) => ({ ...values, metadata: true }));
    let { subscriptionAddress } = inputData.metadataActive;
    subscriptionAddress = new PublicKey(subscriptionAddress);
    const { provider, connection } = getProvider();

    try {
      const subAccount = await connection.getAccountInfo(subscriptionAddress);
      const subData = unpackSubscription(subAccount.data);
      const {
        active,
        depositVault,
        depositMint,
        payee,
        amount,
        duration,
        mint,
        nextRenewTime,
      } = subData;

      const depositVaultBalance = await connection.getTokenAccountBalance(
        depositVault
      );

      setOutput(
        <>
          <h3>Subscription Metadata</h3>
          <p>Active: {active.toString()}</p>
          <p>Mint: {mint == null ? "null" : mint.toBase58()}</p>
          <p>depositVault: {depositVault.toBase58()}</p>
          <p>depositVault balance: {depositVaultBalance.value.amount}</p>
          <p>depositMint: {depositMint.toBase58()}</p>
          <p>payee: {payee.toBase58()}</p>
          <p>amount: {amount.toNumber()}</p>
          <p>duration: {duration.toNumber()}</p>
          <p>nextRenewTime: {nextRenewTime.toNumber()}</p>
        </>
      );
      setButtonState((values) => ({ ...values, metadata: false }));
    } catch (err) {
      console.log(err);
      setOutput("Subscription expired or error occurred. Check browser logs.");
      setButtonState((values) => ({ ...values, metadata: false }));
    }
  };

  return (
    <div className={styles.wrapper}>
      <Head>
        <meta charset="utf-8" />
        <link rel="icon" href="%PUBLIC_URL%/images/squid_apple.png" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Buoyant Demo App</title>
      </Head>
      {showPopup && (
        <div className={styles.popup}>
          <h4>Notice!</h4>
          <p>
            This is a work in progress. Make sure you have switched to devnet in
            your wallet. Make sure you have tokens from the designated mint when
            depositing. Time units are denoted in seconds, token units in their lowest decimal denomination.
          </p>
          <p>If you run into any trouble, please dm us on{" "}
            <a
              href="https://twitter.com/buoyantprotocol"
              target="_blank"
              rel="noreferrer"
            >
              {" "}
              Twitter{" "}
            </a>{" "}
            or submit an issue on our
            <a
              href="https://github.com/IlliniBlockchain/buoyant"
              target="_blank"
              rel="noreferrer"
            >
              {" "}
              Github
            </a>
            .
          </p>
          <p>
            Buoyant is not an app in itself, but a protocol to be built upon.
            We have created a brief control panel for people to demo
            functionality. Enjoy!
          </p>
          <button
            onClick={() => {
              setShowPopup(false);
            }}
          >
            Close
          </button>
        </div>
      )}
      <div className={styles.topBar}>
        <div className={styles.title}>
          <img className={styles.logo} src={"./images/squid_apple.png"} />
          <h1 className={styles.logoText}>Buoyant Demo App</h1>
        </div>
        <div className={styles.connectBox}>
          {walletAddress === null ? (
            <ActionButton
              label={"Connect Wallet"}
              loading={false}
              clickHandler={connectWallet}
            />
          ) : (
            <h3 className={styles.walletAddress}>
              {walletAddress.slice(0, 4) +
                "..." +
                walletAddress.slice(-4, walletAddress.length)}
            </h3>
          )}
        </div>
      </div>

      <div className={styles.app}>
        <div className={styles.leftBox}>
          <div className={styles.leftInputBox}>
            <div className={styles.initializeBox + " " + styles.panel}>
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

            <div className={styles.depositBox + " " + styles.panel}>
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
              <div className={styles.twoBtnBox}>
                <ActionButton
                  label={"Deposit"}
                  loading={buttonState.deposit}
                  clickHandler={sendDeposit}
                />
                <button className={styles.btnDead}>Withdraw</button>
              </div>
            </div>
            <div className={styles.renewBox + " " + styles.panel}>
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

          <div className={styles.rightInputBox}>
            <div className={styles.sendBox + " " + styles.panel}>
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
                placeholder={"owner"}
              />
              <div className={styles.twoBtnBox}>
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

            <div className={styles.metadataBox + " " + styles.panel}>
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
            </div>
          </div>
        </div>

        <div className={styles.rightBox}>
          <h3>Output:</h3>
          <p className={styles.output}>{output}</p>
        </div>
      </div>
    </div>
  );
}
