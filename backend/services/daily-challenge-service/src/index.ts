import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import challengeRoutes from './routes';
import { startScheduler } from './scheduler';
import { RabbitMQClient } from 'shared';

const app = express();
const PORT = process.env.PORT || 5006;

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

app.use('/', challengeRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'Daily Challenge Service OK' });
});

let server: any = { close: () => {} };
const start = async () => {
  const mq = RabbitMQClient.getInstance();
  await mq.connect(process.env.RABBITMQ_URL || 'amqp://localhost');

  server = app.listen(PORT, () => {
    console.log(`Daily Challenge Service listening on port ${PORT}`);
    startScheduler();
  });
};

const shutdown = async () => {
  console.log('Shutting down Challenge Service...');
  if (server) server.close();
  await RabbitMQClient.getInstance().close();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

if (process.env.NODE_ENV !== 'test') start();

export { app, server };
