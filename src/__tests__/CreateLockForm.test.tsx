import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CreateLockForm from '@/components/CreateLockForm';
import { ethers } from 'ethers';

// Mock ethers.js
jest.mock('ethers', () => ({
  ethers: {
    providers: {
      Web3Provider: jest.fn().mockImplementation(() => ({
        getSigner: jest.fn().mockReturnValue({
          getAddress: jest.fn().mockResolvedValue('0x1234567890abcdef1234567890abcdef12345678'),
        }),
        getGasPrice: jest.fn().mockResolvedValue(ethers.BigNumber.from('1000000000')),
      })),
    },
    utils: {
      isAddress: jest.fn().mockReturnValue(true),
      parseUnits: jest.fn().mockReturnValue(ethers.BigNumber.from('1000000000000000000000')),
      formatUnits: jest.fn().mockReturnValue('1000.0'),
      formatEther: jest.fn().mockReturnValue('0.0001'),
    },
    Contract: jest.fn().mockImplementation(() => ({
      name: jest.fn().mockResolvedValue('VinuCoin'),
      symbol: jest.fn().mockResolvedValue('VINU'),
      decimals: jest.fn().mockResolvedValue(18),
      balanceOf: jest.fn().mockResolvedValue(ethers.BigNumber.from('1000000000000000000000')),
      allowance: jest.fn().mockResolvedValue(ethers.BigNumber.from('0')),
      approve: jest.fn().mockResolvedValue({ wait: jest.fn() }),
      estimateGas: {
        createLock: jest.fn().mockResolvedValue(ethers.BigNumber.from('100000')),
      },
      createLock: jest.fn().mockResolvedValue({ wait: jest.fn() }),
    })),
    BigNumber: {
      from: jest.fn(),
    },
  },
}));

describe('CreateLockForm Component', () => {
  const walletAddress = '0x1234567890abcdef1234567890abcdef12345678';

  beforeEach(() => {
    global.window.ethereum = { request: jest.fn() } as any;
  });

  it('renders create lock form', () => {
    render(<CreateLockForm walletAddress={walletAddress} isOwner={false} />);
    expect(screen.getByText('Create New Lock')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Token or LP Address')).toBeInTheDocument();
  });

  it('fetches and displays token details', async () => {
    render(<CreateLockForm walletAddress={walletAddress} isOwner={false} />);
    fireEvent.change(screen.getByPlaceholderText('Token or LP Address'), {
      target: { value: '0xabcdef1234567890abcdef1234567890abcdef12' },
    });
    await waitFor(() => {
      expect(screen.getByText('Token Name: VinuCoin')).toBeInTheDocument();
      expect(screen.getByText('Symbol: VINU')).toBeInTheDocument();
    });
  });

  it('displays gas estimation', async () => {
    render(<CreateLockForm walletAddress={walletAddress} isOwner={false} />);
    fireEvent.change(screen.getByPlaceholderText('Token or LP Address'), {
      target: { value: '0xabcdef1234567890abcdef1234567890abcdef12' },
    });
    fireEvent.change(screen.getByPlaceholderText('Amount to Lock'), {
      target: { value: '1000' },
    });
    await waitFor(() => {
      expect(screen.getByText('Est. Gas: 0.0001 VC')).toBeInTheDocument();
    });
  });
});
