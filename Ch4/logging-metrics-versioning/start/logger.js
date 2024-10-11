const winston = require('winston');
const path = require('path');

// Define log format
const logFormat = winston.format.combine(
 # DEFINE THE LOG FORMAT
);

// Create logger instance
const logger = winston.createLogger({
# CREATE THE LOGGER
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