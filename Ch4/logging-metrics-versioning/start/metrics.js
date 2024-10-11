const promClient = require('prom-client');

// Create a Registry to register the metrics
const register = new promClient.Registry();

// Enable the collection of default metrics
promClient.collectDefaultMetrics({ register });

// Define custom metrics
const httpRequestDurationMicroseconds = new promClient.Histogram({
  # ENTER YOUR HISTOGRAM DETAILS HERE
});

const ragQueryDuration = new promClient.Histogram({
  # ENTER YOUR HISTOGRAM DETAILS HERE
});

const openaiApiCalls = new promClient.Counter({
  # ENTER YOUR COUNTER DETAILS HERE
});

const feedbackCounter = new promClient.Counter({
  # ENTER YOUR FEEDBACK DETAILS HERE
});

// Register the custom metrics
register.registerMetric(httpRequestDurationMicroseconds);
register.registerMetric(ragQueryDuration);
register.registerMetric(openaiApiCalls);
register.registerMetric(feedbackCounter);

module.exports = {
  register,
  httpRequestDurationMicroseconds,
  ragQueryDuration,
  openaiApiCalls,
  feedbackCounter
};