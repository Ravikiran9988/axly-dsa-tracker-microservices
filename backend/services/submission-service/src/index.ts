import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import submissionRoutes from './routes';
import { RabbitMQClient } from 'shared';
import { correlationIdMiddleware, errorHandlerMiddleware } from 'shared';

const app = express();
const PORT = process.env.PORT || 5003;

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(correlationIdMiddleware);

app.use('/', submissionRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'Submission Service OK' });

});

app.get('/readiness', (req, res) => {
  res.json({ status: 'ready' });
});

app.use(errorHandlerMiddleware);

let server: any = { close: () => {} };
const start = async () => {
  const mq = RabbitMQClient.getInstance();
  await mq.connect(process.env.RABBITMQ_URL || 'amqp://localhost');

  server = app.listen(PORT, () => {
    console.log(`Submission Service listening on port ${PORT}`);
  });
};

const shutdown = async () => {
  console.log('Shutting down...');
  if (server) server.close();
  await RabbitMQClient.getInstance().close();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

if (process.env.NODE_ENV !== 'test') start();

export { app, server };
