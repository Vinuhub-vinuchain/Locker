import { render, screen } from '@testing-library/react';
import TokenDetails from '@/components/TokenDetails';

describe('TokenDetails Component', () => {
  it('renders token details when valid', () => {
    const details = {
      name: 'VinuCoin',
      symbol: 'VINU',
      decimals: 18,
      balance: '1000.0',
    };
    render(<TokenDetails details={details} />);
    expect(screen.getByText('Token Name: VinuCoin')).toBeInTheDocument();
    expect(screen.getByText('Symbol: VINU')).toBeInTheDocument();
    expect(screen.getByText('Decimals: 18')).toBeInTheDocument();
    expect(screen.getByText('Balance: 1000.0')).toBeInTheDocument();
  });

  it('does not render when details are invalid', () => {
    const details = {
      name: 'N/A',
      symbol: 'N/A',
      decimals: 18,
      balance: '0',
    };
    const { container } = render(<TokenDetails details={details} />);
    expect(container).toBeEmptyDOMElement();
  });
});
