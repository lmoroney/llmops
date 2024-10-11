const promClient = require('prom-client');

// Create a Registry to register the metrics
const register = new promClient.Registry();

// Enable the collection of default metrics
promClient.collectDefaultMetrics({ register });

// Define custom metrics
const httpRequestDurationMicroseconds = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10] // in seconds
});

const ragQueryDuration = new promClient.Histogram({
  name: 'rag_query_duration_seconds',
  help: 'Duration of RAG queries in seconds',
  buckets: [0.1, 0.5, 1, 2, 5, 10] // in seconds
});

const openaiApiCalls = new promClient.Counter({
  name: 'openai_api_calls_total',
  help: 'Total number of calls made to the OpenAI API'
});

const feedbackCounter = new promClient.Counter({
  name: 'user_feedback_total',
  help: 'Total number of feedback submissions',
  labelNames: ['type']
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