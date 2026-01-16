'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { LOCKER_CONTRACT_ADDRESS, LOCKER_CONTRACT_ABI, ERC20_ABI } from '@/lib/contracts';
import { logDebug } from '@/lib/utils';

interface Props {
  walletAddress: string | null;
}

export default function LockHistory({ walletAddress }: Props) {
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    const loadHistory = async () => {
      if (!walletAddress || !window.ethereum) return;

      try {
        logDebug('Loading lock history...');
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const contract = new ethers.Contract(LOCKER_CONTRACT_ADDRESS, LOCKER_CONTRACT_ABI, provider);

        const filterCreated = contract.filters.LockCreated(null, walletAddress);
        const filterReleased = contract.filters.TokensReleased(null, walletAddress);
        const filterTransferred = contract.filters.LockTransferred(null, walletAddress, null);

        const [eventsCreated, eventsReleased, eventsTransferred] = await Promise.all([
          contract.queryFilter(filterCreated),
          contract.queryFilter(filterReleased),
          contract.queryFilter(filterTransferred),
        ]);

        const allEvents = [...eventsCreated, ...eventsReleased, ...eventsTransferred].sort(
          (a, b) => b.blockNumber - a.blockNumber
        );

        const historyItems = await Promise.all(
          allEvents.map(async (event) => {
            const block = await provider.getBlock(event.blockNumber);
            const timestamp = new Date(block.timestamp * 1000).toLocaleString();

            let description = '';

            if (event.args) {
              if (event.event === 'LockCreated') {
                const tokenContract = new ethers.Contract(event.args.token, ERC20_ABI, provider);
                const symbol = await tokenContract.symbol().catch(() => 'Unknown');
                description = `Created lock #${event.args.lockId} for ${symbol}`;
              } else if (event.event === 'TokensReleased') {
                description = `Released lock #${event.args.lockId}`;
              } else if (event.event === 'LockTransferred') {
                description = `Transferred lock #${event.args.lockId} to ${event.args.to}`;
              }
            }

            return { ...event, timestamp, description };
          })
        );

        setHistory(historyItems);
      } catch (error: any) {
        logDebug(`LockHistory error: ${error.message}`);
      }
    };

    loadHistory();
  }, [walletAddress]);

  return (
    <div className="card p-6 rounded-lg mb-8">
      <h2 className="text-2xl font-semibold mb-4">Lock History</h2>
      {history.length === 0 ? (
        <p>No lock history found.</p>
      ) : (
        <ul>
          {history.map((item, index) => (
            <li key={index} className="border-b py-2">
              {item.timestamp}: {item.description}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
