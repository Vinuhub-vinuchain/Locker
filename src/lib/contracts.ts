import { ethers } from 'ethers';

export const vinuChain = {
  chainId: '0xCF',
  chainName: 'VinuChain',
  nativeCurrency: { name: 'VinuCoin', symbol: 'VC', decimals: 18 },
  rpcUrls: ['https://rpc.vinuchain.org', 'https://vinuchain-rpc.com'],
  blockExplorerUrls: ['https://vinuexplorer.org'],
};

export const LOCKER_CONTRACT_ADDRESS = '0x44C91d977ebCe321c4f878ee508Fb3C809160549';

export const ERC20_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address, uint256) returns (bool)',
];

export const LOCKER_CONTRACT_ABI = [
  'event LockCreated(uint256 indexed id, address indexed beneficiary, address token, uint256 amount, uint256 startTime, uint256 cliffDuration, uint256 vestingDuration)',
  'event TokensReleased(uint256 indexed id, address indexed beneficiary, address token, uint256 amount)',
  'event LockTransferred(uint256 indexed id, address indexed oldBeneficiary, address indexed newBeneficiary)',
  'function totalLocked() view returns (uint256)',
  'function uniqueTokens() view returns (uint256)',
  'function activeLocks() view returns (uint256)',
  'function totalValueUSD() view returns (uint256)',
  'function getLocksForUser(address user) view returns (tuple(uint256 id, address token, address beneficiary, uint256 amount, uint256 startTime, uint256 cliffDuration, uint256 vestingDuration, uint256 released, bool revoked)[])',
  'function releasableAmount(uint256 id) view returns (uint256)',
  'function createLock(address _token, uint256 _amount, uint256 _startTime, uint256 _cliffDuration, uint256 _vestingDuration, address _beneficiary) returns (uint256)',
  'function release(uint256 _id)',
  'function transferLock(uint256 _id, address _newBeneficiary)',
  'function batchRelease(uint256[] _ids)',
  'function batchTransfer(uint256[] _ids, address _newBeneficiary)',
  'function owner() view returns (address)',
  'function setTokenPrice(address _token, uint256 _price)',
  'function paused() view returns (bool)',
];
