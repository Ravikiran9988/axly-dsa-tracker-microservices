import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import progressRoutes from './routes';
import { connectRedis } from './redis';
import { setupConsumers } from './consumer';
import { RabbitMQClient } from 'shared';
import { correlationIdMiddleware, errorHandlerMiddleware } from 'shared';

const app = express();
const PORT = process.env.PORT || 5007;

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(correlationIdMiddleware);

app.use('/', progressRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'Progress Service OK' });

});

app.get('/readiness', (req, res) => {
  res.json({ status: 'ready' });
});

app.use(errorHandlerMiddleware);

let server: any = { close: () => {} };

const start = async () => {
  await connectRedis();
  await setupConsumers(process.env.RABBITMQ_URL || 'amqp://localhost');

  server = app.listen(PORT, () => {
    console.log(`Progress Service listening on port ${PORT}`);
  });
};

// Graceful shutdown
const shutdown = async () => {
  console.log('Shutting down gracefully...');
  if (server) server.close();
  await RabbitMQClient.getInstance().close();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

if (process.env.NODE_ENV !== 'test') {
  start();
}

export { app, start, shutdown };
