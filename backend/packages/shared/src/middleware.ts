import { v4 as uuidv4 } from 'uuid';
import { AppError } from './index';
import { createLogger } from './logger';

const logger = createLogger('shared-middleware');

export const correlationIdMiddleware = (req: any, res: any, next: any) => {
  const correlationId = req.headers['x-correlation-id'] || uuidv4();
  req.headers['x-correlation-id'] = correlationId;
  res.setHeader('x-correlation-id', correlationId);
  next();
};

export const errorHandlerMiddleware = (err: any, req: any, res: any, next: any) => {
  const correlationId = req.headers['x-correlation-id'];
  
  if (err instanceof AppError) {
    logger.warn(`${err.message} - CorrelationId: ${correlationId}`, { correlationId });
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
    });
    return;
  }

  logger.error(`Unhandled error: ${err.message} - CorrelationId: ${correlationId}`, { 
    correlationId, 
    stack: err.stack 
  });
  
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
};

