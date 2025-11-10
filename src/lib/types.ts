import { ethers } from 'ethers';

export interface TokenDetails {
  name: string;
  symbol: string;
  decimals: number;
  balance: string;
}

export interface Lock {
  id: ethers.BigNumber;
  token: string;
  beneficiary: string;
  amount: ethers.BigNumber;
  startTime: number;
  cliffDuration: number;
  vestingDuration: number;
  released: ethers.BigNumber;
  revoked: boolean;
}
