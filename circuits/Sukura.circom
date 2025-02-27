pragma circom 2.0.0;

include "./Withdraw.circom";

component main { public [root, nullifierHash, recipient] } = Withdraw(28);