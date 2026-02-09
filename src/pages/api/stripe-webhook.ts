import type { NextApiRequest, NextApiResponse } from 'next';

// Endpoint dezactivat: Stripe webhook se procesează doar în Express (stripe-webhook-server.js)
// Pentru debug, redenumește sau decomentează codul dacă vrei să folosești din nou acest endpoint.

const handler = (req: NextApiRequest, res: NextApiResponse) => {
  res.status(410).send('Stripe webhook endpoint mutat pe serverul Express (stripe-webhook-server.js). Folosește comanda:\n\nstripe listen --forward-to localhost:3001/api/stripe-webhook\n\nși asigură-te că serverul Express rulează pe portul 3001.');
};

export default handler;
