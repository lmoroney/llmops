const winston = require('winston');
const path = require('path');

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'rag-chatbot' },
  transports: [
    // Write all logs error (and below) to `error.log`
    new winston.transports.File({ filename: path.join(__dirname, 'logs', 'error.log'), level: 'error' }),
    // Write all logs to `combined.log`
    new winston.transports.File({ filename: path.join(__dirname, 'logs', 'combined.log') }),
  ],
});

// If we're not in production, log to the console as well
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
  }));
}

// Create a stream object with a 'write' function that will be used by `morgan`
logger.stream = {
  write: (message) => logger.info(message.trim()),
};

module.exports = logger;