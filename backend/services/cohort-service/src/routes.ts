import express from 'express';

const router = express.Router();

router.use((req, res) => {
  res.status(410).json({ error: { code: 'FEATURE_REMOVED', message: 'Cohorts and membership are no longer part of the Axly core product.' } });
});

export default router;
