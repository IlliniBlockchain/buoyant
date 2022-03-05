use borsh::{BorshDeserialize, BorshSerialize};

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub enum SubscriptionInstruction {
    Initialize {
        
    },
    Deposit {

    },
    Renew {

    },
    Close {

    }
}
