"use client";

import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { LOCKER_CONTRACT_ADDRESS, LOCKER_CONTRACT_ABI } from "@/lib/contracts";
import { logDebug } from "@/lib/utils";

declare global {
  interface Window {
    ethereum?: any;
  }
}

export default function Analytics() {
  const [analytics, setAnalytics] = useState({
    totalLocked: "0",
    uniqueTokens: 0,
    activeLocks: 0,
    totalValueUSD: "0",
  });

  useEffect(() => {
    const loadAnalytics = async () => {
      if (!window.ethereum) {
        logDebug("MetaMask not found");
        return;
      }

      try {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const contract = new ethers.Contract(
          LOCKER_CONTRACT_ADDRESS,
          LOCKER_CONTRACT_ABI,
          provider
        );

        const [totalLocked, uniqueTokens, activeLocks, totalValueUSD] =
          await Promise.all([
            contract.totalLocked().catch(() => ethers.BigNumber.from(0)),
            contract.uniqueTokens().catch(() => 0),
            contract.activeLocks().catch(() => 0),
            contract.totalValueUSD().catch(() => ethers.BigNumber.from(0)),
          ]);

        setAnalytics({
          totalLocked: ethers.utils.formatEther(totalLocked),
          uniqueTokens,
          activeLocks,
          totalValueUSD: ethers.utils.formatUnits(totalValueUSD, 18),
        });
      } catch (error: any) {
        logDebug(`Analytics error: ${error.message}`);
      }
    };

    loadAnalytics();
  }, []);

  return (
    <div className="card p-6 rounded-lg mb-8">
      <h2 className="text-2xl font-semibold mb-4">Platform Analytics</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="text-center">
          <p className="text-3xl font-bold">{analytics.totalLocked}</p>
          <p className="text-gray-400">Total Tokens Locked (VC)</p>
        </div>
        <div className="text-center">
          <p className="text-3xl font-bold">{analytics.uniqueTokens}</p>
          <p className="text-gray-400">Unique Tokens</p>
        </div>
        <div className="text-center">
          <p className="text-3xl font-bold">{analytics.activeLocks}</p>
          <p className="text-gray-400">Active Locks</p>
        </div>
        <div className="text-center">
          <p className="text-3xl font-bold">${analytics.totalValueUSD}</p>
          <p className="text-gray-400">Total Value (USD)</p>
        </div>
      </div>
    </div>
  );
}
