# Firebase Service Account Setup

## Quick Start: Get Your Firebase Key

Follow these steps to get your Firebase service account key:

### Step 1: Open Firebase Console
Go to: https://console.firebase.google.com/project/silkthread-1db8f

### Step 2: Get Service Account Key
1. Click the **⚙️ Settings icon** (top left)
2. Go to **Service Accounts** tab
3. Click **Generate New Private Key**
4. A JSON file will download automatically

### Step 3: Save the Key
1. Rename the downloaded file to: **`firebase-key.json`**
2. Move it to: `D:\software\claude\project2\backend\` folder
3. The file should be at: `D:\software\claude\project2\backend\firebase-key.json`

## Verify the Setup

After placing the `firebase-key.json` file, your backend folder should look like:
```
backend/
├── src/
│   ├── index.js
│   ├── db/
│   │   └── database.js
│   ├── middleware/
│   │   └── auth.js
│   └── routes/
│       ├── auth.js
│       ├── orders.js
│       ├── garments.js
│       ├── measurements.js
│       ├── tailors.js
│       └── analytics.js
├── node_modules/
├── .env                    ← Created ✅
├── .env.example
├── firebase-key.json       ← ADD THIS (download from Firebase)
├── package.json
└── package-lock.json
```

## Start Backend

Once you have `firebase-key.json` in place, run:

```bash
cd backend
npm run dev
```

The server will:
- ✅ Initialize Firebase Firestore
- ✅ Create 7 collections automatically
- ✅ Seed demo data (4 users, 6 garments)
- ✅ Start on http://localhost:5000

## Alternative: Use Environment Variables

If you prefer NOT to store the JSON file, you can:

1. Open your Firebase key JSON file
2. Copy each value to `.env`:
   ```
   FIREBASE_PROJECT_ID=silkthread-1db8f
   FIREBASE_PRIVATE_KEY_ID=abc123def456
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...keep all content...\n-----END PRIVATE KEY-----\n"
   FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@silkthread-1db8f.iam.gserviceaccount.com
   FIREBASE_CLIENT_ID=123456789
   FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
   FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
   ```

3. Comment out or remove the `FIREBASE_SERVICE_ACCOUNT_KEY` line in `.env`

## Troubleshooting

### "Firebase not initialized"
→ Check if `firebase-key.json` exists in `/backend` folder

### "Permission denied" writing to Firestore
→ Firestore security rules might be blocking (check Firebase Console)

### Port 5000 already in use
```bash
# Find and kill process using port 5000
# On Windows Command Prompt:
netstat -ano | findstr :5000
# Then kill it with the PID

# On PowerShell:
Get-Process -Id (Get-NetTCPConnection -LocalPort 5000).OwningProcess | Stop-Process
```

## Next Steps

1. ✅ Download Firebase key from console
2. ✅ Place `firebase-key.json` in `/backend` folder
3. ✅ Run `npm run dev` to start backend
4. ✅ Visit `http://localhost:3002` to test frontend

---

**Need help?** Check the FIREBASE_SETUP.md or SETUP_COMPLETE.md files in the root directory.
