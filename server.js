#!/usr/bin/env node

const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors({
  origin: ['https://admin.toybits.cloud', 'http://localhost:4200'],
  credentials: true
}));
app.use(express.json());

// OpenClaw configuration
const OPENCLAW_PATH = '/root/.nvm/versions/node/v22.21.1/bin/openclaw';
const OPENCLAW_AGENT = 'toybits';
const OPENCLAW_TOKEN = 'b3f0c7a06e654229fcc8a9355f3a67b8313891db57666425';

// Store active sessions
const sessions = new Map();

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'OpenClaw Chat Proxy', version: '1.0.0' });
});

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required and must be a string' });
    }

    // Create or use existing session
    let actualSessionId = sessionId;
    if (!actualSessionId || !sessions.has(actualSessionId)) {
      actualSessionId = `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      sessions.set(actualSessionId, {
        id: actualSessionId,
        createdAt: new Date(),
        lastActivity: new Date(),
        messageCount: 0
      });
    }

    // Update session activity
    const session = sessions.get(actualSessionId);
    session.lastActivity = new Date();
    session.messageCount++;

    console.log(`[${actualSessionId}] Processing: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`);

    // Call OpenClaw
    const openclaw = spawn(OPENCLAW_PATH, [
      'agent',
      '--agent', OPENCLAW_AGENT,
      '--message', message
    ], {
      env: {
        ...process.env,
        PATH: process.env.PATH,
        OPENCLAW_GATEWAY_TOKEN: OPENCLAW_TOKEN
      }
    });

    let response = '';
    let error = '';

    // Collect response
    openclaw.stdout.on('data', (data) => {
      response += data.toString();
    });

    openclaw.stderr.on('data', (data) => {
      error += data.toString();
      console.error(`[${actualSessionId}] OpenClaw stderr:`, data.toString());
    });

    // Handle completion
    openclaw.on('close', (code) => {
      if (code !== 0) {
        console.error(`[${actualSessionId}] OpenClaw exited with code ${code}`);
        if (error) {
          return res.status(500).json({ 
            error: 'OpenClaw processing failed',
            details: error.substring(0, 200),
            sessionId: actualSessionId
          });
        }
      }

      // Clean up response
      const cleanResponse = response.trim();
      
      if (!cleanResponse) {
        return res.status(500).json({ 
          error: 'Empty response from OpenClaw',
          sessionId: actualSessionId
        });
      }

      // Return successful response
      res.json({
        success: true,
        message: cleanResponse,
        sessionId: actualSessionId,
        timestamp: new Date().toISOString(),
        messageCount: session.messageCount
      });
    });

    // Timeout handling
    setTimeout(() => {
      if (!res.headersSent) {
        openclaw.kill();
        res.status(504).json({ 
          error: 'OpenClaw response timeout',
          sessionId: actualSessionId
        });
      }
    }, 30000); // 30 second timeout

  } catch (error) {
    console.error('Chat endpoint error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Session management
app.get('/api/sessions', (req, res) => {
  const sessionList = Array.from(sessions.values()).map(session => ({
    id: session.id,
    createdAt: session.createdAt,
    lastActivity: session.lastActivity,
    messageCount: session.messageCount,
    ageMinutes: Math.round((new Date() - session.createdAt) / 60000)
  }));
  
  res.json({
    totalSessions: sessions.size,
    sessions: sessionList
  });
});

// Clean up old sessions (older than 24 hours)
setInterval(() => {
  const now = new Date();
  const twentyFourHoursAgo = new Date(now - 24 * 60 * 60 * 1000);
  
  let cleaned = 0;
  for (const [sessionId, session] of sessions.entries()) {
    if (session.lastActivity < twentyFourHoursAgo) {
      sessions.delete(sessionId);
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    console.log(`Cleaned up ${cleaned} old sessions`);
  }
}, 60 * 60 * 1000); // Run every hour

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 OpenClaw Chat Proxy running on port ${PORT}`);
  console.log(`📡 Endpoint: http://0.0.0.0:${PORT}/api/chat`);
  console.log(`🔗 Health check: http://0.0.0.0:${PORT}/health`);
  console.log(`🤖 OpenClaw Agent: ${OPENCLAW_AGENT}`);
  console.log(`🌐 Allowed origins: https://admin.toybits.cloud, http://localhost:4200`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});