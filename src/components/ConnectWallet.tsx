import { useEffect } from 'react';
import { ethers } from 'ethers';
import { vinuChain, LOCKER_CONTRACT_ADDRESS, LOCKER_CONTRACT_ABI } from '@/lib/contracts';
import { logDebug } from '@/lib/utils';

interface Props {
  setWalletAddress: (address: string | null) => void;
  setIsOwner: (isOwner: boolean) => void;
}

export default function ConnectWallet({ setWalletAddress, setIsOwner }: Props) {
  const showStatus = (message: string, type: 'success' | 'error') => {
    const statusDiv = document.createElement('div');
    statusDiv.className = `fixed bottom-4 right-4 p-4 rounded-lg ${type === 'success' ? 'bg-green-900 border border-green-500' : 'bg-red-900 border border-red-500'} text-white`;
    statusDiv.innerHTML = message;
    document.body.appendChild(statusDiv);
    setTimeout(() => statusDiv.remove(), 5000);
    logDebug(`Status: ${message} (${type})`);
  };

  const connectWallet = async () => {
    logDebug('Connect Wallet button clicked');
    if (!window.ethereum) {
      showStatus('MetaMask not detected. Please install MetaMask.', 'error');
      logDebug('Error: window.ethereum undefined');
      return;
    }

    try {
      logDebug('Requesting accounts...');
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if (!accounts || accounts.length === 0) {
        showStatus('No accounts found. Please unlock MetaMask.', 'error');
        logDebug('Error: No accounts returned');
        return;
      }

      const network = await provider.getNetwork();
      logDebug(`Current chain ID: ${network.chainId}`);
      if (network.chainId !== 207) {
        logDebug('Attempting to switch to VinuChain...');
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: vinuChain.chainId }],
          });
        } catch (switchError: any) {
          if (switchError.code === 4902) {
            logDebug('Adding VinuChain...');
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [vinuChain],
            });
          } else {
            showStatus(`Failed to switch to VinuChain: ${switchError.message}`, 'error');
            logDebug(`Switch error: ${switchError.message}`);
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
      logDebug(`Connected wallet: ${address}, isOwner: ${owner.toLowerCase() === address.toLowerCase()}`);
      showStatus(`Connected: ${address}${owner.toLowerCase() === address.toLowerCase() ? ' (Admin)' : ''}`, 'success');
    } catch (error: any) {
      showStatus(`Failed to connect: ${error.message}`, 'error');
      logDebug(`Connect error: ${error.message}`);
    }
  };

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('chainChanged', () => {
        logDebug('Chain changed, reloading...');
        window.location.reload();
      });
      window.ethereum.on('accountsChanged', () => {
        logDebug('Accounts changed, reloading...');
        window.location.reload();
      });
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
