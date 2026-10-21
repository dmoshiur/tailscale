import { Router } from 'express';
import { PLANS } from '../lib/plans.js';

const router = Router();

/**
 * Public configuration the landing page needs.
 * No secrets ever leave the server through this route.
 */
router.get('/', (req, res) => {
  res.json({
    ok: true,
    brand: {
      name: 'FFV2 PRO',
      product: 'FFV2 PRO Access',
      support: process.env.SUPPORT_CONTACT || '@ffv2pro',
    },
    payment: {
      provider: 'bKash',
      method: 'Manual Send Money + admin verification',
      merchantName: process.env.BKASH_MERCHANT_NAME || 'FFV2 PRO',
      merchantNumber: process.env.BKASH_MERCHANT_NUMBER || '01XXXXXXXXX',
      currency: 'BDT',
      verificationWindow: 'Usually verified within a few minutes during 10:00–23:00 (GMT+6)',
    },
    plans: PLANS,
  });
});

export default router;
