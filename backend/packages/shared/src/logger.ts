import winston from 'winston';

const { combine, timestamp, printf, colorize } = winston.format;

const customFormat = printf(({ level, message, timestamp, correlationId, service }) => {
  let log = `${timestamp} [${level}]`;
  if (service) log += ` [${service}]`;
  if (correlationId) log += ` [${correlationId}]`;
  log += `: ${message}`;
  return log;
});

export const createLogger = (serviceName: string) => {
  return winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: combine(
      timestamp(),
      customFormat
    ),
    defaultMeta: { service: serviceName },
    transports: [
      new winston.transports.Console({
        format: combine(
          colorize(),
          timestamp(),
          customFormat
        )
      })
    ]
  });
};

