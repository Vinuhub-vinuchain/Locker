import { TokenDetails as TokenDetailsType } from '@/lib/types';

interface Props {
  details: TokenDetailsType;
}

export default function TokenDetails({ details }: Props) {
  if (details.name === 'N/A' && details.symbol === 'N/A') return null;

  return (
    <div className="token-details">
      <p><strong>Token Name:</strong> {details.name}</p>
      <p><strong>Symbol:</strong> {details.symbol}</p>
      <p><strong>Decimals:</strong> {details.decimals}</p>
      <p><strong>Balance:</strong> {details.balance}</p>
    </div>
  );
}
