const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

const openai = require('./openai');

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const systemPrompt = "You are an expert in public speaking, and you know how to create engaging and powerful talks. You understand how to structure them, and put them in simple language. Help me create a new talk by starting a conversation with me about what the talk will be about.";

// Function to generate a unique user ID
function generateUserId() {
  return crypto.randomBytes(16).toString('hex');
}

// Function to log conversation
function logConversation(userId, conversation) {
  const logDir = path.join(__dirname, 'logs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
  }
  const logFile = path.join(logDir, `${userId}.json`);
  fs.writeFileSync(logFile, JSON.stringify(conversation, null, 2));
}

io.on('connection', (socket) => {
  console.log('New client connected');

  // Generate a unique user ID for this session
  const userId = generateUserId();
  console.log(`Assigned user ID: ${userId}`);

  // Send initial message when a client connects
  socket.emit('chat response', "Hello! I'm here to help you create an engaging and powerful talk. Let's start by discussing what your talk will be about. What topic or idea would you like to present?");

  let conversationHistory = [
    { role: "system", content: systemPrompt }
  ];

  // Log initial conversation state
  logConversation(userId, conversationHistory);

  socket.on('chat message', async (message) => {
    try {
      // Emit 'thinking' status
      socket.emit('thinking', true);

      // Add user message to conversation history
      conversationHistory.push({ role: "user", content: message });

      // Log conversation after user message
      logConversation(userId, conversationHistory);

      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: conversationHistory,
      });

      const response = completion.choices[0].message.content;
      
      // Add assistant response to conversation history
      conversationHistory.push({ role: "assistant", content: response });

      // Log conversation after assistant response
      logConversation(userId, conversationHistory);

      // Emit 'thinking' status as false
      socket.emit('thinking', false);

      socket.emit('chat response', response);
    } catch (error) {
      console.error('Error:', error);
      // Emit 'thinking' status as false in case of error
      socket.emit('thinking', false);
      socket.emit('chat response', 'Sorry, there was an error processing your request.');
    }
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${userId}`);
    // Final log of the conversation when user disconnects
    logConversation(userId, conversationHistory);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});