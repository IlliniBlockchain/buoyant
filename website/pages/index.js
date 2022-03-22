import Head from "next/head";
import Image from "next/image";
import styles from "../styles/Home.module.css";

export default function Home() {
  return (
    <div className={styles.wrapper}>
      <Head>
        <title>Buoyant Protocol</title>
        <link rel="icon" type="image/x-icon" href="./images/squid_apple.png"/>

        <meta name="viewport" content="width=device-width, initial-scale=1.0"/> 
        <meta charset="UTF-8"/>

        <meta name="description" content="Buoyant is a protocol for on-chain subscriptions built on Solana."/>
        <meta name="keywords" content="Crypto, Subscription, Solana, Tradable, NFT, Token, Protocol, Blockchain, Payments"/>
        <meta name="author" content="Illini Blockchain"/>

        {/* <!-- index: tells bots to index the page --> */}
        {/* <!-- nofollow: tells bots not to crawl links on the page, and that no endorsement is implied --> */}
        <meta name="robots" content="index, nofollow"/>
        
        <link rel="preconnect" href="https://fonts.googleapis.com"/>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin/>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Inter:wght@300;400;500;600&family=Roboto+Mono:wght@300;400;500;600&display=swap" rel="stylesheet"/> 

        {/* <!-- SEO meta tags --> */}
        <meta name="twitter:card" content="Stay afloat. Buoyant is a base protocol for recurring payments built on Solana." />
        <meta name="twitter:site" content="@buoyantprotocol" />
        <meta name="twitter:creator" content="@ILL_Blockchain" />
        <meta property="og:url" content="https://buoyant.it" />
        <meta property="og:title" content="Buoyant Protocol" />
        <meta property="og:description" content="Stay afloat. Buoyant is a base protocol for recurring payments built on Solana." />
        <meta property="og:image" content="https://buoyant.it/images/squid_blue_bg.png" />
      </Head>

      <div className={styles.nav}>
        <a className={styles.homeLink} href="/">
          <div className={styles.leftNav}>
            <img className={styles.logo} src="./images/squid_apple.png" />
            <h1 className={styles.logoText}>Buoyant</h1>
          </div>
        </a>

        <div className={styles.middleNav}>
          <a href="https://buoyant.gitbook.io/buoyant/" target="_blank">
            Docs
          </a>
          <a href="https://github.com/IlliniBlockchain/buoyant" target="_blank">
            Github
          </a>
          <a href="https://twitter.com/buoyantprotocol" target="_blank">
            Twitter
          </a>
        </div>

        <div className={styles.rightNav}>
          <a href="/demo-app.html" target="_blank">
            <button className={styles.appBtn}>Launch App</button>
          </a>
        </div>
      </div>

      <div className={styles.center}>
        <img className={styles.leftImg + " " + styles.bgFish} src="./images/model_squid.png" />
        <div className={styles.rightText}>
          <h2>Stay afloat.</h2>
          <h3>
            Buoyant is a base protocol for recurring payments built on Solana.
          </h3>
          <a href="https://buoyant.gitbook.io/buoyant/" target="_blank">
            <button className={styles.buildBtn}>Build on Buoyant</button>
          </a>
        </div>
      </div>

      <div className={styles.center}>
        <img className={styles.middleImg + " " + styles.bgFish} src="./images/model_turtle.png" />
        <div className={styles.middleText}>
          <h2>On-Chain Subscriptions</h2>
          <div className={styles.threeBlocks}>
            <div className={styles.block}>
              <img src="./images/waterDrop.png" />
              <h3>Tradable Subscriptions</h3>
              <p>
                Tokenized subscriptions allow you to trade on open markets. Sell
                a 30-day subscription after 20 days. Buy a 10-day trial for
                cheaper.
              </p>
            </div>
            <div className={styles.block}>
              <img src="./images/recycle.png" />
              <h3>Auto-Renewals</h3>
              <p>
                Participate and get compensated for upholding Buoyant's renewal
                mechanic. Focus on building your product, not subscriptions.
              </p>
            </div>
            <div className={styles.block}>
              <img src="./images/solanaLogo.png" />
              <h3>Wicked Fast</h3>
              <p>
                Recurring payments aren't possible on high-fee layer 1
                blockchains. Solana's speed and low costs enable novel on-chain
                primitives.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.center}>
        <img
          className={styles.rightImg + " " + styles.bgFish}
          src="./images/model_jellyfish3.png"
        />
        <div className={styles.leftText}>
          <h2>Subs not dubs.</h2>
          <h3>
            Buoyant is built by a team of hackers from{" "}
            <a
              className={styles.h3Link}
              href="https://twitter.com/ILL_Blockchain"
              target="_blank"
            >
              Illini Blockchain
            </a>
            , a blockchain student organization at the University of Illinois at
            Urbana-Champaign.
          </h3>
        </div>
      </div>

      <div className={styles.contactBox}>
        <h3>
          Follow us on Twitter{" "}
          <a
            className={styles.h3Link}
            href="https://twitter.com/buoyantprotocol"
            target="_blank"
          >
            @buoyantprotocol
          </a>{" "}
          to stay up to date with our progress.
        </h3>
      </div>

      <div className={styles.footer}>
        <div className={styles.footerLeft}>
          <div className={styles.footerLogo}>
            <img className={styles.logo} src="./images/squid_apple.png" />
            <h1 className={styles.logoText}>Buoyant</h1>
          </div>
          <p className={styles.footerContact}>
            For additional inquiries, email us at buoyantprotocol@protonmail.com
          </p>
        </div>
        <div className={styles.footerLinks}>
          <h4 className={styles.footerHeader}>Links</h4>
          <a href="https://buoyant.gitbook.io/buoyant/" target="_blank">
            Docs
          </a>
          <a href="https://github.com/IlliniBlockchain/buoyant" target="_blank">
            Github
          </a>
          <a href="https://twitter.com/buoyantprotocol" target="_blank">
            Twitter
          </a>
        </div>
      </div>
    </div>
  );
}
