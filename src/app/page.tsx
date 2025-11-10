'use client';

import { useState } from 'react';
import ConnectWallet from '@/components/ConnectWallet';
import Header from '@/components/Header';
import CreateLockForm from '@/components/CreateLockForm';
import UserLocks from '@/components/UserLocks';
import LockHistory from '@/components/LockHistory';
import Analytics from '@/components/Analytics';
import Roadmap from '@/components/Roadmap';
import Footer from '@/components/Footer';

export default function Home() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);

  return (
    <div className="container mx-auto p-4">
      <Header />
      <ConnectWallet setWalletAddress={setWalletAddress} setIsOwner={setIsOwner} />
      <CreateLockForm walletAddress={walletAddress} isOwner={isOwner} />
      <UserLocks walletAddress={walletAddress} />
      <LockHistory walletAddress={walletAddress} />
      <Analytics />
      <Roadmap />
      <Footer />
    </div>
  );
}
