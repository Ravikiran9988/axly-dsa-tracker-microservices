import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import aiRoutes from './routes';

const app = express();
const PORT = process.env.PORT || 5005;

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

app.use('/', aiRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'AI Service OK' });
});

let server: any = { close: () => {} };
if (process.env.NODE_ENV !== 'test') {
  server = app.listen(PORT, () => {
    console.log(`AI Service listening on port ${PORT}`);
  });
}

export { app, server };
