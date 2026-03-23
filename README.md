# OpenClaw Chat Proxy Server

Node.js proxy server that connects Angular applications to OpenClaw AI.

**GitHub Repository**: https://github.com/cyddalupan/toybits_proxy

## 🎯 Purpose

This server acts as a bridge between:
- **Frontend**: Angular PWA at `https://admin.toybits.cloud/`
- **Backend**: OpenClaw AI running on the same server

## 🏗️ Architecture

```
Angular App → HTTPS → Apache Proxy → Node.js Server → OpenClaw CLI → AI Response
```

## 📦 Installation

```bash
cd /root/openclaw-chat-proxy
npm install
```

## 🚀 Running

```bash
node server.js
```

Or as a background service:
```bash
nohup node server.js > proxy.log 2>&1 &
```

## 🔧 Configuration

### Server Settings (server.js)
- **Port**: 3000
- **OpenClaw Agent**: `toybits`
- **Session Timeout**: 30 seconds
- **Session Cleanup**: 24 hours

### Apache Configuration
Apache acts as a reverse proxy with:
- HTTPS termination
- CORS headers
- SSL certificates

## 🔌 API Endpoints

### POST `/api/chat`
Send messages to OpenClaw AI.

**Request:**
```json
{
  "message": "Hello, how are you?",
  "sessionId": "optional-session-id"
}
```

**Response:**
```json
{
  "success": true,
  "message": "AI response here...",
  "sessionId": "chat-1234567890-abc123",
  "timestamp": "2026-03-23T13:15:15.301Z",
  "messageCount": 1
}
```

### GET `/health`
Health check endpoint.

## 🔒 Security

- **CORS**: Only allows `https://admin.toybits.cloud`
- **HTTPS**: All traffic encrypted
- **Session Isolation**: Each chat gets unique session
- **Timeouts**: 30-second request timeout

## 📊 Monitoring

Check logs:
```bash
tail -f proxy.log
```

Health check:
```bash
curl http://localhost:3000/health
```

## 🐛 Troubleshooting

### Common Issues:

1. **OpenClaw not responding**
   ```bash
   openclaw agent --message "test"
   ```

2. **Port 3000 in use**
   ```bash
   lsof -i :3000
   kill -9 <PID>
   ```

3. **Apache proxy not working**
   ```bash
   systemctl reload apache2
   tail -f /var/log/apache2/admin-error.log
   ```

## 📝 Deployment Notes

- **Location**: `/root/openclaw-chat-proxy/`
- **Apache Config**: `/etc/apache2/sites-available/admin.toybits.cloud-le-ssl.conf`
- **Angular App**: `/var/www/pwa.toybits.cloud/angular-skeleton/`

## 🔮 Future Enhancements

1. WebSocket support for real-time streaming
2. File upload support
3. Rate limiting
4. Authentication
5. Conversation history storage