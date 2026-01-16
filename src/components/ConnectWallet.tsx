'use client';

import { useEffect } from 'react';
import { ethers } from 'ethers';
import { vinuChain, LOCKER_CONTRACT_ADDRESS, LOCKER_CONTRACT_ABI } from '@/lib/contracts';
import { logDebug } from '@/lib/utils';

interface Props {
  walletAddress: string | null;
  setWalletAddress: (address: string | null) => void;
  setIsOwner: (isOwner: boolean) => void;
}

export default function ConnectWallet({ walletAddress, setWalletAddress, setIsOwner }: Props) {
  const showStatus = (message: string, type: 'success' | 'error') => {
    const statusDiv = document.createElement('div');
    statusDiv.className = `fixed bottom-4 right-4 p-4 rounded-lg ${
      type === 'success' ? 'bg-green-900 border border-green-500' : 'bg-red-900 border border-red-500'
    } text-white`;
    statusDiv.innerHTML = message;
    document.body.appendChild(statusDiv);
    setTimeout(() => statusDiv.remove(), 5000);
    logDebug(`Status: ${message} (${type})`);
  };

  const connectWallet = async () => {
    logDebug('Connect Wallet button clicked');
    if (!window.ethereum) {
      showStatus('MetaMask not detected. Please install MetaMask.', 'error');
      return;
    }

    try {
      // @ts-ignore – MetaMask injects this at runtime
const provider = new ethers.providers.Web3Provider(window.ethereum);
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if (!accounts || accounts.length === 0) {
        showStatus('No accounts found. Please unlock MetaMask.', 'error');
        return;
      }

      const network = await provider.getNetwork();
      if (network.chainId !== 207) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: vinuChain.chainId }],
          });
        } catch (switchError: any) {
          if (switchError.code === 4902) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [vinuChain],
            });
          } else {
            showStatus(`Failed to switch to VinuChain: ${switchError.message}`, 'error');
            return;
          }
        }
      }

      const signer = provider.getSigner();
      const address = await signer.getAddress();
      const contract = new ethers.Contract(LOCKER_CONTRACT_ADDRESS, LOCKER_CONTRACT_ABI, signer);
      const owner = await contract.owner();
      setWalletAddress(address);
      setIsOwner(owner.toLowerCase() === address.toLowerCase());
      showStatus(`Connected: ${address}${owner.toLowerCase() === address.toLowerCase() ? ' (Admin)' : ''}`, 'success');
    } catch (error: any) {
      showStatus(`Failed to connect: ${error.message}`, 'error');
    }
  };

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('chainChanged', () => window.location.reload());
      window.ethereum.on('accountsChanged', () => window.location.reload());
    }
  }, []);

  return (
    <div className="mb-8 text-center">
      <button onClick={connectWallet} className="btn-primary font-bold py-2 px-4 rounded">
        Connect Wallet
      </button>
      <p className="mt-2 text-gray-400">{walletAddress || ''}</p>
    </div>
  );
}
