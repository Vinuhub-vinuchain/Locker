import { render, screen, fireEvent } from '@testing-library/react';
import ConnectWallet from '@/components/ConnectWallet';
import { ethers } from 'ethers';

// Mock ethers.js and window.ethereum
jest.mock('ethers', () => ({
  ethers: {
    providers: {
      Web3Provider: jest.fn().mockImplementation(() => ({
        getNetwork: jest.fn().mockResolvedValue({ chainId: 207 }),
        getSigner: jest.fn().mockReturnValue({
          getAddress: jest.fn().mockResolvedValue('0x1234567890abcdef1234567890abcdef12345678'),
        }),
      })),
    },
    utils: {
      isAddress: jest.fn(),
    },
    Contract: jest.fn().mockImplementation(() => ({
      owner: jest.fn().mockResolvedValue('0x1234567890abcdef1234567890abcdef12345678'),
    })),
    BigNumber: {
      from: jest.fn(),
    },
  },
}));

describe('ConnectWallet Component', () => {
  beforeEach(() => {
    // Mock window.ethereum
    global.window.ethereum = {
      request: jest.fn().mockResolvedValue(['0x1234567890abcdef1234567890abcdef12345678']),
      on: jest.fn(),
    } as any;
  });

  it('renders connect wallet button', () => {
    render(<ConnectWallet setWalletAddress={jest.fn()} setIsOwner={jest.fn()} />);
    expect(screen.getByText('Connect Wallet')).toBeInTheDocument();
  });

  it('connects wallet and displays address', async () => {
    const setWalletAddress = jest.fn();
    const setIsOwner = jest.fn();
    render(<ConnectWallet setWalletAddress={setWalletAddress} setIsOwner={setIsOwner} />);
    fireEvent.click(screen.getByText('Connect Wallet'));
    await screen.findByText('0x1234567890abcdef1234567890abcdef12345678');
    expect(setWalletAddress).toHaveBeenCalledWith('0x1234567890abcdef1234567890abcdef12345678');
    expect(setIsOwner).toHaveBeenCalledWith(true);
  });
});
