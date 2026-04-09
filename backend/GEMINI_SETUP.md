# Google Gemini setup (free tier)

1. Open **[Google AI Studio](https://aistudio.google.com/apikey)** and sign in with your Google account.
2. Click **Create API key** and copy the key.
3. In `backend/.env` add:
   ```env
   GEMINI_API_KEY=paste_your_key_here
   ```
4. Restart the FastAPI server.

Optional:

```env
GEMINI_MODEL=gemini-2.0-flash
```

If a model name returns 404 in your region, try `gemini-1.5-flash` instead.

## API routes (all require login)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/study-sets/ai/status` | `{ "enabled": true/false }` |
| POST | `/study-sets/ai/hint` | Short hint for a question |
| POST | `/study-sets/ai/explain` | Explain the student’s answer |
| POST | `/study-sets/ai/feedback` | Short encouragement after correct/incorrect |
| POST | `/study-sets/ai/generate-questions` | Draft questions for a topic |

## Deploying

- Put `GEMINI_API_KEY` in your host’s environment (Render, Railway, Fly.io, etc.).  
- **Do not** commit `.env` or the key to Git.  
- The Practice page calls hint/explain when the key is present; `/ai/status` can be used to hide AI buttons if disabled.

## “429 / quota exceeded” (very common on free tier)

`enabled: true` only means a key is set. Google still enforces **per-minute and per-day limits** on the free tier.

**What to do:**

1. **Wait** — limits reset (often within minutes for RPM, daily for day caps). Don’t spam Hint/Explain while testing.
2. **AI Studio** — Open [Google AI Studio](https://aistudio.google.com/) → check **usage / quotas** for your project and key.
3. **Another model** — In `.env` try:
   ```env
   GEMINI_MODEL=gemini-1.5-flash
   ```
   (Separate quota pool from `gemini-2.0-flash` in some accounts.)
4. **Billing** — In Google Cloud, enabling billing on the linked project can raise limits (may incur cost; read Google’s pricing first).
5. **New key** — A new API key in the same project usually **does not** bypass project-wide quota; fixing usage/billing is the real fix.

This is **not** a bug in your app — the integration is working; Google is throttling requests.
