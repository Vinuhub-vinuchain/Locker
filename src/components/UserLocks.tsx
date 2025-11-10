import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { LOCKER_CONTRACT_ADDRESS, LOCKER_CONTRACT_ABI, ERC20_ABI, vinuChain } from '@/lib/contracts';
import { logDebug, shareOnX } from '@/lib/utils';

interface Props {
  walletAddress: string | null;
}

export default function UserLocks({ walletAddress }: Props) {
  const [locks, setLocks] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');
  const [hasReleasable, setHasReleasable] = useState(false);
  const [hasTransferable, setHasTransferable] = useState(false);
  const [status, setStatus] = useState('');

  const showStatus = (message: string, type: 'success' | 'error') => {
    setStatus(message);
    setTimeout(() => setStatus(''), 5000);
    logDebug(`Status: ${message} (${type})`);
  };

  const loadLocks = async (selectedFilter: string) => {
    if (!walletAddress) return;
    try {
      logDebug('Loading user locks...');
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const contract = new ethers.Contract(LOCKER_CONTRACT_ADDRESS, LOCKER_CONTRACT_ABI, provider.getSigner());
      const userLocks = await contract.getLocksForUser(walletAddress);
      let filteredLocks = userLocks;
      if (selectedFilter === 'active') {
        filteredLocks = userLocks.filter((lock: any) => !lock.revoked && lock.released < lock.amount);
      } else if (selectedFilter === 'vested') {
        filteredLocks = userLocks.filter((lock: any) => !lock.revoked && lock.released >= lock.amount);
      } else if (selectedFilter === 'revoked') {
        filteredLocks = userLocks.filter((lock: any) => lock.revoked);
      }

      const lockDetails = await Promise.all(
        filteredLocks.map(async (lock: any) => {
          const tokenContract = new ethers.Contract(lock.token, ERC20_ABI, provider);
          const [symbol, decimals, releasable] = await Promise.all([
            tokenContract.symbol().catch(() => 'Unknown'),
            tokenContract.decimals().catch(() => 18),
            contract.releasableAmount(lock.id),
          ]);
          let gasText = '-';
          if (releasable > 0) {
            try {
              const gas = await contract.estimateGas.release(lock.id);
              const gasPrice = await provider.getGasPrice();
              gasText = `${ethers.utils.formatEther(gas.mul(gasPrice)).slice(0, 6)} VC`;
            } catch {
              gasText = 'N/A';
            }
          }
          return { ...lock, symbol, decimals, releasable, gasText };
        })
      );

      setHasReleasable(lockDetails.some((lock: any) => lock.releasable > 0));
      setHasTransferable(lockDetails.some((lock: any) => !lock.revoked && lock.released < lock.amount));
      setLocks(lockDetails);
      logDebug(`Loaded ${lockDetails.length} locks`);
    } catch (error: any) {
      showStatus(`Failed to load locks: ${error.message}`, 'error');
      logDebug(`Load locks error: ${error.message}`);
    }
  };

  useEffect(() => {
    loadLocks(filter);
  }, [walletAddress, filter]);

  const handleRelease = async (lockId: string) => {
    try {
      logDebug(`Releasing lock ${lockId}`);
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const contract = new ethers.Contract(LOCKER_CONTRACT_ADDRESS, LOCKER_CONTRACT_ABI, provider.getSigner());
      showStatus('Releasing tokens...', 'success');
      const tx = await contract.release(lockId);
      await tx.wait();
      showStatus(`Released tokens! <a href="${vinuChain.blockExplorerUrls[0]}/tx/${tx.hash}" target="_blank">View Tx</a>`, 'success');
      logDebug(`Released lock ${lockId}, tx: ${tx.hash}`);
      loadLocks(filter);
    } catch (error: any) {
      showStatus(`Failed to release: ${error.reason || error.message}`, 'error');
      logDebug(`Release error: ${error.message}`);
    }
  };

  const handleTransfer = async (lockId: string) => {
    const newBeneficiary = prompt('Enter new beneficiary address:');
    if (!newBeneficiary || !ethers.utils.isAddress(newBeneficiary)) {
      showStatus('Invalid beneficiary address.', 'error');
      return;
    }
    try {
      logDebug(`Transferring lock ${lockId}`);
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const contract = new ethers.Contract(LOCKER_CONTRACT_ADDRESS, LOCKER_CONTRACT_ABI, provider.getSigner());
      showStatus('Transferring lock...', 'success');
      const gas = await contract.estimateGas.transferLock(lockId, newBeneficiary);
      const gasPrice = await provider.getGasPrice();
      showStatus(`Transferring lock (Est. Gas: ${ethers.utils.formatEther(gas.mul(gasPrice)).slice(0, 6)} VC)...`, 'success');
      const tx = await contract.transferLock(lockId, newBeneficiary);
      await tx.wait();
      showStatus(`Lock transferred! <a href="${vinuChain.blockExplorerUrls[0]}/tx/${tx.hash}" target="_blank">View Tx</a>`, 'success');
      logDebug(`Transferred lock ${lockId}, tx: ${tx.hash}`);
      loadLocks(filter);
    } catch (error: any) {
      showStatus(`Failed to transfer: ${error.reason || error.message}`, 'error');
      logDebug(`Transfer error: ${error.message}`);
    }
  };

  const handleBatchRelease = async () => {
    try {
      logDebug('Checking releasable locks...');
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const contract = new ethers.Contract(LOCKER_CONTRACT_ADDRESS, LOCKER_CONTRACT_ABI, provider.getSigner());
      const releasableIds = locks
        .filter((lock: any) => !lock.revoked && lock.releasable > 0)
        .map((lock: any) => lock.id);
      if (releasableIds.length === 0) {
        showStatus('No locks eligible for release.', 'error');
        return;
      }
      showStatus(`Releasing ${releasableIds.length} locks...`, 'success');
      const gas = await contract.estimateGas.batchRelease(releasableIds);
      const gasPrice = await provider.getGasPrice();
      showStatus(`Releasing ${releasableIds.length} locks (Est. Gas: ${ethers.utils.formatEther(gas.mul(gasPrice)).slice(0, 6)} VC)...`, 'success');
      const tx = await contract.batchRelease(releasableIds);
      await tx.wait();
      showStatus(`Batch released! <a href="${vinuChain.blockExplorerUrls[0]}/tx/${tx.hash}" target="_blank">View Tx</a>`, 'success');
      logDebug(`Batch released, tx: ${tx.hash}`);
      loadLocks(filter);
    } catch (error: any) {
      showStatus(`Batch release failed: ${error.reason || error.message}`, 'error');
      logDebug(`Batch release error: ${error.message}`);
    }
  };

  const handleBatchTransfer = async () => {
    const newBeneficiary = prompt('Enter new beneficiary address for batch transfer:');
    if (!newBeneficiary || !ethers.utils.isAddress(newBeneficiary)) {
      showStatus('Invalid beneficiary address.', 'error');
      return;
    }
    try {
      logDebug('Checking transferable locks...');
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const contract = new ethers.Contract(LOCKER_CONTRACT_ADDRESS, LOCKER_CONTRACT_ABI, provider.getSigner());
      const transferableIds = locks
        .filter((lock: any) => !lock.revoked && lock.released < lock.amount)
        .map((lock: any) => lock.id);
      if (transferableIds.length === 0) {
        showStatus('No locks eligible for transfer.', 'error');
        return;
      }
      showStatus(`Transferring ${transferableIds.length} locks...`, 'success');
      const gas = await contract.estimateGas.batchTransfer(transferableIds, newBeneficiary);
      const gasPrice = await provider.getGasPrice();
      showStatus(`Transferring ${transferableIds.length} locks (Est. Gas: ${ethers.utils.formatEther(gas.mul(gasPrice)).slice(0, 6)} VC)...`, 'success');
      const tx = await contract.batchTransfer(transferableIds, newBeneficiary);
      await tx.wait();
      showStatus(`Batch transferred! <a href="${vinuChain.blockExplorerUrls[0]}/tx/${tx.hash}" target="_blank">View Tx</a>`, 'success');
      logDebug(`Batch transferred, tx: ${tx.hash}`);
      loadLocks(filter);
    } catch (error: any) {
      showStatus(`Batch transfer failed: ${error.reason || error.message}`, 'error');
      logDebug(`Batch transfer error: ${error.message}`);
    }
  };

  return (
    <div className="card p-6 rounded-lg mb-8">
      <h2 className="text-2xl font-semibold mb-4">Your Locks</h2>
      <div className="flex justify-between mb-4">
        <select className="p-2 rounded" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">All Locks</option>
          <option value="active">Active</option>
          <option value="vested">Fully Vested</option>
          <option value="revoked">Revoked</option>
        </select>
        <div>
          {hasReleasable && (
            <button className="btn-secondary font-bold py-1 px-2 rounded mr-2" onClick={handleBatchRelease}>
              Batch Release
            </button>
          )}
          {hasTransferable && (
            <button className="btn-secondary font-bold py-1 px-2 rounded" onClick={handleBatchTransfer}>
              Batch Transfer
            </button>
          )}
        </div>
      </div>
      <div className="space-y-4">
        {locks.length === 0 ? (
          <div className="text-center">
            <div className="spinner"></div>
            <p>{walletAddress ? 'No locks found.' : 'Connect wallet to load locks'}</p>
          </div>
        ) : (
          locks.map((lock) => (
            <div key={lock.id} className="border border-gray-600 p-4 rounded">
              <p>
                Lock ID: {lock.id.toString()}
                {lock.cliffDuration >= 30 * 86400 && <span className="trusted-badge">Trusted Lock</span>}
              </p>
              <p>Token: {lock.token} ({lock.symbol})</p>
              <p>Amount: {ethers.utils.formatUnits(lock.amount, lock.decimals)}</p>
              <p>Released: {ethers.utils.formatUnits(lock.released, lock.decimals)}</p>
              <p>Releasable: {ethers.utils.formatUnits(lock.releasable, lock.decimals)}</p>
              <p>Start: {new Date(lock.startTime * 1000).toLocaleString()}</p>
              <p>Cliff: {lock.cliffDuration / 86400} days</p>
              <p>Vesting: {lock.vestingDuration / 86400} days</p>
              <p>Status: {lock.revoked ? 'Revoked' : lock.releasable > 0 ? 'Releasable' : lock.released >= lock.amount ? 'Fully Vested' : 'Locked/Vesting'}</p>
              <div className="mt-2">
                {lock.releasable > 0 && (
                  <button className="btn-secondary font-bold py-1 px-2 rounded mr-2" onClick={() => handleRelease(lock.id)}>
                    Release (Est. Gas: {lock.gasText})
                  </button>
                )}
                {!lock.revoked && lock.released < lock.amount && (
                  <button className="btn-secondary font-bold py-1 px-2 rounded mr-2" onClick={() => handleTransfer(lock.id)}>
                    Transfer
                  </button>
                )}
                <button className="btn-secondary font-bold py-1 px-2 rounded" onClick={() => shareOnX(`Check out my lock #${lock.id} on VinuHub!`, '')}>
                  Share on X
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      {status && (
        <div className={`mt-2 p-2 rounded ${status.includes('Failed') ? 'bg-red-900' : 'bg-green-900'}`}>
          <span dangerouslySetInnerHTML={{ __html: status }} />
        </div>
      )}
    </div>
  );
}
