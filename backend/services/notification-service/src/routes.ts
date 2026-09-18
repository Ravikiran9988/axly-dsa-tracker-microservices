import express from 'express';

const router = express.Router();

router.get('/health', (req, res) => {
  res.json({ status: 'Notification Service OK' });
});

router.get('/', (req, res) => {
  res.status(200).json({ data: { notifications: [] }});
});

router.patch('/:id/read', (req, res) => {
  res.status(200).json({ data: { success: true }});
});

router.post('/read-all', (req, res) => {
  res.status(200).json({ data: { success: true }});
});

export default router;
