import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import executionRoutes from './routes';

const app = express();
const PORT = process.env.PORT || 5004; // Internal Service

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

app.use('/', executionRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'Execution Service OK' });
});

export const server = app.listen(PORT, () => {
  console.log(`Execution Service listening on port ${PORT}`);
});

export default app;
