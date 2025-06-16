import type { NextApiRequest, NextApiResponse } from 'next';

// Mocked AddressFinder API for address validation/autocomplete
const mockAddressData: Record<string, string> = {
  NMI001: '1 Market St, Sydney NSW 2000, Australia',
  NMI002: '123 Collins St, Melbourne VIC 3000, Australia',
  NMI003: '456 Queen St, Brisbane QLD 4000, Australia',
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { nmi } = req.query;
  if (typeof nmi !== 'string') {
    res.status(400).json({ error: 'Missing or invalid NMI' });
    return;
  }
  const address = mockAddressData[nmi];
  if (!address) {
    res.status(404).json({ error: 'NMI not found' });
    return;
  }
  res.status(200).json({ nmi, address });
}
