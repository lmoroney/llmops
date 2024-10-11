const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
require('dotenv').config();

// For Logging
const morgan = require('morgan')
const logger = require('./logger')
// End For

// For Metrics
const metrics = require('./metrics');
// End For

// For versioning
const { getCurrentVersion, updateVersion } = require('./version');
// End For

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

const openai = require('./openai');
const { ChromaClient, OpenAIEmbeddingFunction } = require('chromadb');

// For Logging
app.use(morgan('combined', {stream: logger.stream}));
// End For

// FOr Metrics Collection
// Add middleware to collect HTTP request duration metric
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (metrics.httpRequestDurationMicroseconds) {
      metrics.httpRequestDurationMicroseconds
        .labels(req.method, req.path, res.statusCode.toString())
        .observe(duration / 1000); // Convert to seconds
    } else {
      logger.error('httpRequestDurationMicroseconds metric is undefined');
    }
  });
  next();
});

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Expose metrics endpoint for Prometheus to scrape
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', metrics.register.contentType);
  res.end(await metrics.register.metrics());
});
// End For

// For Versioning
// Add a new route to get the current version
app.get('/version', async (req, res) => {
  const version = await getCurrentVersion();
  res.json({ version });
});

// Add a new route to update the version (you might want to secure this in a real application)
app.post('/version/update', async (req, res) => {
  const { type } = req.body;
  try {
    const newVersion = await updateVersion(type);
    res.json({ version: newVersion });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Modify your existing routes to include version information
app.get('/', async (req, res) => {
  const version = await getCurrentVersion();
  res.send(`Welcome to the RAG application v${version}`);
});
// End For



app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'feedback_admin.html'));
});

//const systemPrompt = "You are a helpful chatbot who wil analyze information that is sent to you in prompts with Context, and will reason across that data to give intelligent answers."
const systemPrompt = "You are an expert in public speaking, and you know how to create engaging and powerful talks. You understand how to structure them, and put them in simple language. Help me create a new talk by starting a conversation with me about what the talk will be about.";


function generateUserId() {
  return crypto.randomBytes(16).toString('hex');
}

async function logConversation(userId, conversation) {
  const logDir = path.join(__dirname, 'logs');
  await fs.mkdir(logDir, { recursive: true });
  const logFile = path.join(logDir, `${userId}.json`);
  await fs.writeFile(logFile, JSON.stringify(conversation, null, 2));
  logger.debug(`Conversation logged for user ${userId}`);
}

async function logFeedback(userId, messageId, feedback, message) {
  const logDir = path.join(__dirname, 'feedback_logs');
  await fs.mkdir(logDir, { recursive: true });
  const logFile = path.join(logDir, `${userId}_feedback.json`);
  const feedbackEntry = { messageId, feedback, message, timestamp: new Date().toISOString() };
  
  let feedbackLog = [];
  try {
    const existingLog = await fs.readFile(logFile, 'utf8');
    feedbackLog = JSON.parse(existingLog);
  } catch (error) {
    // File doesn't exist yet, which is fine
  }
  feedbackLog.push(feedbackEntry);
  await fs.writeFile(logFile, JSON.stringify(feedbackLog, null, 2));
  logger.info(`Feedback logged for user ${userId}, message ${messageId}: ${feedback}`);

}

async function queryChromaDB(message){
  logger.debug(`Querying ChromaDB with message: ${message}`);
  const start = Date.now();
  const embedder = new OpenAIEmbeddingFunction({
      openai_api_key: openai.openai_api_key,
      model_name: "text-embedding-ada-002"
    });
    const client = new ChromaClient({
      path: "http://127.0.0.1:8000"
    });
    const collection = await client.getCollection({
      name: 'pdf_embeddings',
      embeddingFunction: embedder
    });
    const queryEmbedding = await embedder.generate([message]);
    let resultString = '';
    const results = await collection.query({
      queryEmbeddings: queryEmbedding,
      nResults: 5
    });

    if (results.documents && results.documents[0]) {
      results.documents[0].forEach((doc, index) => {
        resultString += `\n${index + 1}. ${doc}\n`;
      });
    } else {
      resultString += "\n";
    }
    if (metrics.ragQueryDuration) {
      metrics.ragQueryDuration.observe((Date.now() - start) / 1000);
    } else {
      logger.error('ragQueryDuration metric is undefined');
    }
    logger.debug(`ChromaDB query result: ${resultString}`);
    return resultString
}

io.on('connection', (socket) => {
  logger.info('New client connected');

  const userId = generateUserId();

  logger.info(`Assigned user ID: ${userId}`);

  getCurrentVersion().then(version => {
    socket.emit('chat response', { 
      messageId: crypto.randomBytes(16).toString('hex'),
      content: `Hello! I'm the Space Cadets expert (v${version}). How can I help you today?`,
      isInitialMessage: true
    });
  });

  let conversationHistory = [
    { role: "system", content: systemPrompt }
  ];

  logConversation(userId, conversationHistory);

  async function generateResponse() {
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: conversationHistory,
    });

    const response = completion.choices[0].message.content;
    const messageId = crypto.randomBytes(16).toString('hex');
    
    conversationHistory.push({ role: "assistant", content: response, messageId });
    await logConversation(userId, conversationHistory);

    return { messageId, content: response };
  }

  socket.on('chat message', async (message) => {
    try {
      logger.info(`Received message from user ${userId}`);
      socket.emit('Retrieving RAG', true)
      const ragStart = Date.now();
      let ragString = "Context:\n"
      ragString += await queryChromaDB(message)
      ragString += "\n"
      ragString += "Message:\n"
      ragString += message
      ragString += "\n"
      if (metrics.ragQueryDuration) {
        metrics.ragQueryDuration.observe((Date.now() - ragStart) / 1000);
      } else {
        logger.error('ragQueryDuration metric is undefined');
      }
      logger.debug(`RAG string for user ${userId}: ${ragString}`);
      socket.emit('thinking', true);

      conversationHistory.push({ role: "user", content: ragString });
      await logConversation(userId, conversationHistory);

      if (metrics.openaiApiCalls) {
        metrics.openaiApiCalls.inc();
      } else {
        logger.error('openaiApiCalls metric is undefined');
      }
      const response = await generateResponse();

      logger.info(`Generated response for user ${userId}`);
      socket.emit('thinking', false);
      socket.emit('chat response', response);
    } catch (error) {
      logger.error(`Error processing message for user ${userId}:`, error);
      socket.emit('thinking', false);
      socket.emit('chat response', { 
        messageId: crypto.randomBytes(16).toString('hex'),
        content: 'Sorry, there was an error processing your request.'
      });
    }
  });

  socket.on('feedback', async (data) => {
    const { messageId, feedback } = data;
    if (metrics.feedbackCounter) {
      metrics.feedbackCounter.labels(feedback).inc();
    } else {
      logger.error('feedbackCounter metric is undefined');
    }
    const message = conversationHistory.find(entry => entry.messageId === messageId)?.content || '';
    logFeedback(userId, messageId, feedback, message);
    console.log(`Feedback received for message ${messageId}: ${feedback}`);

    if (feedback === 'bad') {
      try {
        socket.emit('thinking', true);
        // Remove the last assistant message from conversation history
        conversationHistory.pop();
        const newResponse = await generateResponse();
        socket.emit('thinking', false);
        socket.emit('regenerate response', {
          oldMessageId: messageId,
          newResponse: {
            messageId: newResponse.messageId,
            content: "Trying again... " + newResponse.content
          }
        });
      } catch (error) {
        console.error('Error regenerating response:', error);
        socket.emit('thinking', false);
        socket.emit('chat response', { 
          messageId: crypto.randomBytes(16).toString('hex'),
          content: 'Sorry, there was an error regenerating the response.'
        });
      }
    }
  });

  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${userId}`);
    logConversation(userId, conversationHistory);
  });
});

// Admin routes
app.get('/admin/feedback-summary', async (req, res) => {
  const logDir = path.join(__dirname, 'feedback_logs');
  const files = await fs.readdir(logDir);
  let good = 0, neutral = 0, bad = 0;

  for (const file of files) {
    const content = await fs.readFile(path.join(logDir, file), 'utf8');
    const feedbackLog = JSON.parse(content);
    feedbackLog.forEach(entry => {
      if (entry.feedback === 'good') good++;
      else if (entry.feedback === 'neutral') neutral++;
      else if (entry.feedback === 'bad') bad++;
    });
  }

  res.json({ good, neutral, bad, totalFiles: files.length });
});

app.get('/admin/feedback-files', async (req, res) => {
  const logDir = path.join(__dirname, 'feedback_logs');
  const files = await fs.readdir(logDir);
  res.json(files);
});

app.get('/admin/feedback-file/:filename', async (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, 'feedback_logs', filename);
  try {
    const content = await fs.readFile(filePath, 'utf8');
    res.json(JSON.parse(content));
  } catch (error) {
    console.error('Error reading feedback file:', error);
    res.status(500).json({ error: 'Error reading feedback file' });
  }
});

app.post('/admin/feedback-file/:filename', async (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, 'feedback_logs', filename);
  const content = req.body.content;

  try {
    await fs.writeFile(filePath, JSON.stringify(JSON.parse(content), null, 2));
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving file:', error);
    res.status(500).json({ success: false, error: 'Error saving file' });
  }
});

// Error handling
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

async function startServer() {
  try {
    const version = await getCurrentVersion();
    server.listen(PORT, () => {
      console.log(`Server v${version} running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = {
  app,
  startServer
};
