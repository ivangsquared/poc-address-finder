import type { NextApiRequest, NextApiResponse } from 'next';

// Mocked NMI to geocode mapping
const nmiGeocodeData: Record<string, { lat: number; lng: number }> = {
  NMI001: { lat: -33.8708, lng: 151.2073 },
  NMI002: { lat: -37.8136, lng: 144.9631 },
  NMI003: { lat: -27.4698, lng: 153.0251 },
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { nmi } = req.query;
  if (typeof nmi !== 'string') {
    res.status(400).json({ error: 'Missing or invalid NMI' });
    return;
  }
  const geocode = nmiGeocodeData[nmi];
  if (!geocode) {
    res.status(404).json({ error: 'NMI not found' });
    return;
  }
  res.status(200).json({ nmi, ...geocode });
}
