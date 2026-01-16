'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import {
  LOCKER_CONTRACT_ADDRESS,
  ERC20_ABI,
  LOCKER_CONTRACT_ABI,
  vinuChain,
} from '@/lib/contracts';
import { TokenDetails as TokenDetailsType } from '@/lib/types';
import { logDebug, shareOnX } from '@/lib/utils';
import TokenDetails from './TokenDetails';

// Extend Window for Ethereum provider
declare global {
  interface Window {
    ethereum?: any;
  }
}

interface Props {
  walletAddress: string | null;
  isOwner: boolean;
}

export default function CreateLockForm({ walletAddress, isOwner }: Props) {
  const [tokenAddress, setTokenAddress] = useState('');
  const [lockAmount, setLockAmount] = useState('');
  const [startDate, setStartDate] = useState('');
  const [cliffDuration, setCliffDuration] = useState('');
  const [vestingDuration, setVestingDuration] = useState('');
  const [beneficiary, setBeneficiary] = useState('');
  const [tokenDetails, setTokenDetails] = useState<TokenDetailsType>({
    name: 'N/A',
    symbol: 'N/A',
    decimals: 18,
    balance: '0',
  });
  const [gasEstimate, setGasEstimate] = useState('');
  const [status, setStatus] = useState('');
  const [priceTokenAddress, setPriceTokenAddress] = useState('');
  const [tokenPrice, setTokenPrice] = useState('');
  const [priceGasEstimate, setPriceGasEstimate] = useState('');

  const showStatus = (message: string, type: 'success' | 'error') => {
    setStatus(message);
    setTimeout(() => setStatus(''), 5000);
    logDebug(`Status: ${message} (${type})`);
  };

  const fetchTokenDetails = async () => {
    if (!walletAddress || !ethers.utils.isAddress(tokenAddress)) {
      setGasEstimate('Invalid token address');
      setTokenDetails({ name: 'N/A', symbol: 'N/A', decimals: 18, balance: '0' });
      logDebug('Invalid token address or no wallet');
      return;
    }

    if (!window.ethereum) {
      setGasEstimate('Ethereum provider not found');
      return;
    }

    try {
      logDebug('Fetching token details...');
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);

      const [name, symbol, decimals, balance] = await Promise.all([
        tokenContract.name().catch(() => 'Unknown'),
        tokenContract.symbol().catch(() => 'Unknown'),
        tokenContract.decimals().catch(() => 18),
        tokenContract.balanceOf(walletAddress).catch(() => '0'),
      ]);

      setTokenDetails({
        name,
        symbol,
        decimals,
        balance: ethers.utils.formatUnits(balance, decimals),
      });

      logDebug(`Token details: name=${name}, symbol=${symbol}, decimals=${decimals}, balance=${balance}`);

      // Gas estimate if lockAmount is valid
      if (lockAmount && !isNaN(parseFloat(lockAmount)) && parseFloat(lockAmount) > 0) {
        try {
          const contract = new ethers.Contract(
            LOCKER_CONTRACT_ADDRESS,
            LOCKER_CONTRACT_ABI,
            provider.getSigner()
          );
          const amount = ethers.utils.parseUnits(lockAmount, decimals);
          const startTime = Math.floor(Date.now() / 1000) + 86400;
          const cliff = parseInt(cliffDuration) || 0;
          const vesting = parseInt(vestingDuration) || 0;

          const gas = await contract.estimateGas.createLock(
            tokenAddress,
            amount,
            startTime,
            cliff * 86400,
            vesting * 86400,
            walletAddress
          );
          const gasPrice = await provider.getGasPrice();
          setGasEstimate(`Est. Gas: ${ethers.utils.formatEther(gas.mul(gasPrice)).slice(0, 6)} VC`);
          logDebug(`Gas estimate: ${ethers.utils.formatEther(gas.mul(gasPrice))}`);
        } catch (gasError: any) {
          setGasEstimate(`Gas estimation failed: ${gasError.reason || gasError.message}`);
          logDebug(`Gas estimation error: ${gasError.reason || gasError.message}`);
        }
      } else {
        setGasEstimate('Enter a valid amount to estimate gas');
      }
    } catch (error: any) {
      setGasEstimate('Invalid token address');
      setTokenDetails({ name: 'N/A', symbol: 'N/A', decimals: 18, balance: '0' });
      logDebug(`Token details fetch error: ${error.message}`);
    }
  };

  useEffect(() => {
    if (tokenAddress) fetchTokenDetails();
  }, [tokenAddress, lockAmount, walletAddress]);

  const handleCreateLock = async () => {
    if (!walletAddress) {
      showStatus('Connect your wallet first.', 'error');
      return;
    }

    if (!ethers.utils.isAddress(tokenAddress)) {
      showStatus('Invalid token address.', 'error');
      return;
    }

    if (!lockAmount || isNaN(parseFloat(lockAmount)) || parseFloat(lockAmount) <= 0) {
      showStatus('Invalid lock amount.', 'error');
      return;
    }

    if (!startDate) {
      showStatus('Please select a start date.', 'error');
      return;
    }

    if (!window.ethereum) {
      showStatus('Ethereum provider not found', 'error');
      return;
    }

    try {
      logDebug('Creating lock...');
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
      const contract = new ethers.Contract(LOCKER_CONTRACT_ADDRESS, LOCKER_CONTRACT_ABI, signer);

      const amount = ethers.utils.parseUnits(lockAmount, tokenDetails.decimals);
      const startTime = Math.floor(new Date(startDate).getTime() / 1000);
      const cliff = parseInt(cliffDuration) || 0;
      const vesting = parseInt(vestingDuration) || 0;

      // Ensure beneficiary is always a string
      const beneficiaryAddr = beneficiary?.trim() ? beneficiary : walletAddress;

      if (!ethers.utils.isAddress(beneficiaryAddr)) {
        showStatus('Invalid beneficiary address.', 'error');
        return;
      }

      if (vesting > 0 && cliff > vesting) {
        showStatus('Cliff duration cannot exceed vesting duration.', 'error');
        return;
      }

      showStatus('Approving tokens...', 'success');
      const allowance = await tokenContract.allowance(walletAddress, LOCKER_CONTRACT_ADDRESS);
      if (allowance.lt(amount)) {
        const approveTx = await tokenContract.approve(LOCKER_CONTRACT_ADDRESS, amount);
        await approveTx.wait();
        logDebug('Tokens approved');
      }

      showStatus('Creating lock...', 'success');
      const tx = await contract.createLock(
        tokenAddress,
        amount,
        startTime,
        cliff * 86400,
        vesting * 86400,
        beneficiaryAddr
      );
      await tx.wait();

      showStatus(
        `Lock created! <a href="${vinuChain.blockExplorerUrls[0]}/tx/${tx.hash}" target="_blank">View Tx</a>`,
        'success'
      );
      logDebug(`Lock created, tx: ${tx.hash}`);
      shareOnX(
        `Created a lock for ${ethers.utils.formatUnits(amount, tokenDetails.decimals)} ${tokenDetails.symbol} on VinuHub!`,
        tx.hash
      );

      setTokenAddress('');
      setLockAmount('');
      setStartDate('');
      setCliffDuration('');
      setVestingDuration('');
      setBeneficiary('');
      setTokenDetails({ name: 'N/A', symbol: 'N/A', decimals: 18, balance: '0' });
    } catch (error: any) {
      showStatus(`Failed to create lock: ${error.reason || error.message}`, 'error');
      logDebug(`Create lock error: ${error.message}`);
    }
  };

  const handleSetTokenPrice = async () => {
    if (!walletAddress) {
      showStatus('Connect your wallet first.', 'error');
      return;
    }

    if (!ethers.utils.isAddress(priceTokenAddress)) {
      showStatus('Invalid token address.', 'error');
      return;
    }

    if (!tokenPrice || isNaN(parseFloat(tokenPrice)) || parseFloat(tokenPrice) <= 0) {
      showStatus('Invalid price.', 'error');
      return;
    }

    if (!window.ethereum) {
      showStatus('Ethereum provider not found', 'error');
      return;
    }

    try {
      logDebug('Setting token price...');
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const contract = new ethers.Contract(LOCKER_CONTRACT_ADDRESS, LOCKER_CONTRACT_ABI, provider.getSigner());
      const price = ethers.utils.parseUnits(tokenPrice, 18);
      const gas = await contract.estimateGas.setTokenPrice(priceTokenAddress, price);
      const gasPrice = await provider.getGasPrice();
      setPriceGasEstimate(`Est. Gas: ${ethers.utils.formatEther(gas.mul(gasPrice)).slice(0, 6)} VC`);

      const tx = await contract.setTokenPrice(priceTokenAddress, price);
      await tx.wait();

      showStatus(
        `Token price set! <a href="${vinuChain.blockExplorerUrls[0]}/tx/${tx.hash}" target="_blank">View Tx</a>`,
        'success'
      );
      logDebug(`Token price set, tx: ${tx.hash}`);
      setPriceTokenAddress('');
      setTokenPrice('');
    } catch (error: any) {
      showStatus(`Failed to set token price: ${error.reason || error.message}`, 'error');
      logDebug(`Set token price error: ${error.message}`);
    }
  };

  return (
    <>
      <div className="card p-6 rounded-lg mb-8">
        <h2 className="text-2xl font-semibold mb-4">Create New Lock</h2>
        <div className="grid grid-cols-1 gap-4">
          <div className="tooltip">
            <input
              type="text"
              placeholder="Token or LP Address"
              className="p-2 rounded"
              value={tokenAddress}
              onChange={(e) => setTokenAddress(e.target.value)}
            />
            <span className="tooltiptext">Enter the ERC20 token or liquidity pool (LP) token address</span>
          </div>
          <TokenDetails details={tokenDetails} />
          <div className="flex items-center">
            <input
              type="number"
              step="0.000000000000000001"
              placeholder="Amount to Lock"
              className="p-2 rounded flex-1"
              value={lockAmount}
              onChange={(e) => setLockAmount(e.target.value)}
            />
            <button
              className="btn-secondary font-bold py-1 px-2 ml-2 rounded"
              disabled={tokenDetails.balance === '0'}
              onClick={() => setLockAmount(tokenDetails.balance)}
            >
              Max
            </button>
          </div>
          <input
            type="datetime-local"
            className="p-2 rounded"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <div className="tooltip">
            <input
              type="number"
              placeholder="Cliff Duration (days)"
              min="0"
              className="p-2 rounded"
              value={cliffDuration}
              onChange={(e) => setCliffDuration(e.target.value)}
            />
            <span className="tooltiptext">Waiting period before tokens can be released (0 = immediate)</span>
          </div>
          <div className="tooltip">
            <input
              type="number"
              placeholder="Vesting Duration (days)"
              min="0"
              className="p-2 rounded"
              value={vestingDuration}
              onChange={(e) => setVestingDuration(e.target.value)}
            />
            <span className="tooltiptext">Period over which tokens release after cliff (0 = all at once)</span>
          </div>
          <input
            type="text"
            placeholder="Beneficiary Address (optional)"
            className="p-2 rounded"
            value={beneficiary}
            onChange={(e) => setBeneficiary(e.target.value)}
          />
          <div className="text-sm text-gray-400">{gasEstimate}</div>
          <button className="btn-primary font-bold py-2 px-4 rounded" onClick={handleCreateLock}>
            Create Lock
          </button>
          {status && (
            <div className={`mt-2 p-2 rounded ${status.includes('Failed') ? 'bg-red-900' : 'bg-green-900'}`}>
              <span dangerouslySetInnerHTML={{ __html: status }} />
            </div>
          )}
        </div>
      </div>

      {isOwner && (
        <div className="card p-6 rounded-lg mb-8">
          <h2 className="text-2xl font-semibold mb-4">Manage Token Prices (Admin)</h2>
          <div className="grid grid-cols-1 gap-4">
            <input
              type="text"
              placeholder="Token Address"
              className="p-2 rounded"
              value={priceTokenAddress}
              onChange={(e) => setPriceTokenAddress(e.target.value)}
            />
            <input
              type="number"
              step="0.000000000000000001"
              placeholder="Price in USD"
              className="p-2 rounded"
              value={tokenPrice}
              onChange={(e) => setTokenPrice(e.target.value)}
            />
            <div className="text-sm text-gray-400">{priceGasEstimate}</div>
            <button className="btn-primary font-bold py-2 px-4 rounded" onClick={handleSetTokenPrice}>
              Set Token Price
            </button>
            {status && (
              <div className={`mt-2 p-2 rounded ${status.includes('Failed') ? 'bg-red-900' : 'bg-green-900'}`}>
                <span dangerouslySetInnerHTML={{ __html: status }} />
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
