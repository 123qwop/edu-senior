# Google Sign-In Setup (about 5 minutes)

Your app is already set up to use Google OAuth. You only need to create credentials and paste them into `.env`.

## 1. Open Google Cloud Console

Go to: **https://console.cloud.google.com/apis/credentials**

(If asked, sign in with your Google account and create or select a project.)

## 2. Create OAuth consent screen (if you haven’t already)

- In the left sidebar, click **“OAuth consent screen”**.
- Choose **External** (unless you use a Google Workspace org), then **Create**.
- Fill in **App name** (e.g. “AED” or “My Edu App”) and **User support email** (your email).
- Click **Save and Continue** through Scopes and Test users (you can skip adding scopes/test users for now).
- Click **Back to Dashboard**.

## 3. Create OAuth client ID

- In the left sidebar, click **“Credentials”**.
- Click **“+ Create Credentials”** → **“OAuth client ID”**.
- **Application type:** choose **“Web application”**.
- **Name:** e.g. “AED Web” (any name is fine).
- Under **“Authorized redirect URIs”**, click **“Add URI”** and add exactly:
  ```text
  http://localhost:8000/auth/google/callback
  ```
- Click **Create**.

## 4. Copy the Client ID and Client Secret

- A popup will show **Your Client ID** and **Your Client Secret**.
- Copy both (you can also open them later from **Credentials** → your OAuth 2.0 Client ID).

## 5. Paste into your backend `.env`

Open:

```text
edu-senior/backend/.env
```

Find these lines (at the bottom):

```text
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

Paste your values (no quotes needed):

```text
GOOGLE_CLIENT_ID=123456789-xxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxx
```

Save the file.

## 6. Restart the backend

Restart your FastAPI server (stop it and run again):

```bash
cd edu-senior/backend
python3 -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## 7. Try again

Open your app, go to Login, and click **Google**. You should be sent to Google to sign in, then back to your app.

---

**If you see “redirect_uri_mismatch”:**  
Make sure the redirect URI in Google Cloud is exactly:

```text
http://localhost:8000/auth/google/callback
```

(No trailing slash, `http` not `https`, port `8000`.)

---

## Production / Deployment

The **same logic** (start → Google → callback → set cookies → redirect) is used in production. No code changes are required. You only need to configure production URLs and credentials.

1. **In Google Cloud Console** (same OAuth client or a new one):
   - Open [Credentials](https://console.cloud.google.com/apis/credentials).
   - Edit your OAuth 2.0 Client ID (or create one for production).
   - Under **Authorized redirect URIs**, add your **production** callback, for example:
     ```text
     https://api.yourdomain.com/auth/google/callback
     ```
   - You can keep both localhost (for dev) and the production URL in the list.

2. **In your production environment** (e.g. server `.env` or platform env vars):
   - Set **`FRONTEND_URL`** to your live frontend, e.g. `https://yourdomain.com` (no trailing slash).
   - Set **`BACKEND_URL`** to your live API, e.g. `https://api.yourdomain.com` (no trailing slash).
   - Set **`GOOGLE_CLIENT_ID`** and **`GOOGLE_CLIENT_SECRET`** (same as dev, or use a separate production OAuth client).

3. **HTTPS**: Production must use HTTPS. The app already sets cookies with `Secure`, which is required for production.

After that, “Sign in with Google” and “Sign up with Google” work the same in production; users are created or logged in and redirected to your frontend.
