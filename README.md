# WA Gear Notification API

API serverless untuk mengirim pesan WhatsApp melalui WA Gear Chrome Extension.

## 🚀 Deploy (1-Klik)

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/danukidd/wagear-notification-api)

## ⚙️ Setup

### 1. Deploy ke Netlify
Klik tombol **Deploy to Netlify** di atas, atau deploy manual:
```bash
npm install
netlify init
netlify deploy --prod
```

### 2. Set API Key
Di Netlify Dashboard → **Site Settings** → **Environment Variables**, tambahkan:

| Key | Value |
|-----|-------|
| `DSCE_API_KEY` | API key pilihan Anda (contoh: `wg-notif-abc123xyz`) |

> ⚠️ Setelah set env variable, re-deploy: `netlify deploy --prod`

### 3. Konfigurasi Extension
Buka **WA Gear Side Panel** → **Netlify Notification API**:
- Enable notification polling
- Masukkan **API URL**: `https://nama-site-anda.netlify.app`
- Masukkan **API Key**: sama dengan `DSCE_API_KEY`
- Klik **Test Connection** untuk verifikasi

## 📡 API Endpoints

### Kirim Pesan
```
POST /.netlify/functions/send
```
**Headers:**
```
Content-Type: application/json
x-api-key: api-key-anda
```
**Body:**
```json
{
  "to": "628xxxxxxxxxx",
  "message": "Halo dari API!",
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

### Cek Pending
```
GET /.netlify/functions/pending
Headers: x-api-key: api-key-anda
```

### Konfirmasi Terkirim
```
POST /.netlify/functions/ack
Body: { "id": "msg-uuid", "status": "sent" }
```

## 🧪 Test via cURL

```bash
# Kirim pesan
curl -X POST https://nama-site.netlify.app/.netlify/functions/send \
  -H "Content-Type: application/json" \
  -H "x-api-key: api-key-anda" \
  -d '{"to": "628xxxxxxxxxx", "message": "Test dari API!"}'
```

## 📋 Catatan
- Polling interval: 30 detik
- WhatsApp Web harus terbuka & extension aktif
- Pesan terkirim otomatis dalam 0-30 detik setelah masuk queue
- Free tier Netlify: 125K function invocations/bulan
