mod client;
use solana_sdk::signer::keypair::Keypair;
use solana_sdk::pubkey::Pubkey;

fn main() {
    let args = std::env::args().collect::<Vec<_>>();
    let program_pubkey = &args[1];

    // Connect to testnet
    let connection = client::establish_connection().unwrap();
    println!(
        "Connected to remote solana node running version ({}).",
        connection.get_version().unwrap()
    );

    // Create payer/vault mint account (user) and airdrop it 1 SOL
    let user = Keypair::new();
    let airdrop = 2;
    client::request_airdrop(&user, &connection, airdrop.pow(9)).unwrap();
    
    let counter = Keypair::new();

    // Create counter data account    
    // Create subscription data account
    // Create vault
    // Create payee user account


    zc::client::say_hello(&user, &program_pubkey, &connection).unwrap();
    println!(
        "({}) greetings have been sent.",
        zc::client::count_greetings(&user, &program, &connection).unwrap()
    )
}