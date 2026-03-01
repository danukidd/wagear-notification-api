# WA Gear Notification API

Serverless API for sending WhatsApp messages through the WA Gear Chrome Extension.

## 🚀 Deploy (1-Click)

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/danukidd/wagear-notification-api)

## ⚙️ Setup

### 1. Deploy to Netlify
Click the **Deploy to Netlify** button above, or deploy manually:
```bash
npm install
netlify init
netlify deploy --prod
```

### 2. Set API Key
In Netlify Dashboard → **Site Settings** → **Environment Variables**, add:

| Key | Value |
|-----|-------|
| `DSCE_API_KEY` | Your chosen API key (e.g. `wg-notif-abc123xyz`) |

> ⚠️ After setting the env variable, re-deploy: `netlify deploy --prod`

### 3. Configure the Extension
Open **WA Gear Side Panel** → **Netlify Notification API**:
- Enable notification polling
- Enter **API URL**: `https://your-site-name.netlify.app`
- Enter **API Key**: same as `DSCE_API_KEY`
- Click **Test Connection** to verify

## 📡 API Endpoints

### Send Message
```
POST /.netlify/functions/send
```
**Headers:**
```
Content-Type: application/json
x-api-key: your-api-key
```
**Body:**
```json
{
  "to": "628xxxxxxxxxx",
  "message": "Hello from the API!",
  "type": "text"
}
```
**Response:**
```json
{
  "success": true,
  "id": "msg-uuid",
  "message": "Notification queued successfully"
}
```

### Check Pending
```
GET /.netlify/functions/pending
Headers: x-api-key: your-api-key
```

### Acknowledge Sent
```
POST /.netlify/functions/ack
Body: { "id": "msg-uuid", "status": "sent" }
```

## 🧪 Test via cURL

```bash
# Send a message
curl -X POST https://your-site-name.netlify.app/.netlify/functions/send \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{"to": "628xxxxxxxxxx", "message": "Test from the API!"}'
```

## 📋 Notes
- Polling interval: 30 seconds
- WhatsApp Web must be open & the extension must be active
- Messages are sent automatically within 0–30 seconds after entering the queue
- Netlify free tier: 125K function invocations/month
