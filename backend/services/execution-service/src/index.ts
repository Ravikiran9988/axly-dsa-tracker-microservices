import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import executionRoutes from './routes';

const app = express();
const PORT = process.env.PORT || 5004;

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

app.use('/', executionRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'Execution Service OK' });
});

let server: any = { close: () => {} };
if (process.env.NODE_ENV !== 'test') {
  server = app.listen(PORT, () => {
    console.log(`Execution Service listening on port ${PORT}`);
  });
} else {
  // Just for testing
  server = { close: () => {} };
}

export { app, server };
