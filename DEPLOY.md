# GreenPoints: deploy and run

## 0. Before you start
- Console me apna region dekho (jaise `ap-south-1`). Ye wahi region hoga jisme sab kuch banega.
- Region check (CloudShell me): `aws rekognition list-collections`
  Agar "Could not connect to the endpoint URL" aaye, us region me Rekognition nahi hai. Message bhej dena.

## 1. Backend deploy (AWS CloudShell se)
1. Console ke top bar me CloudShell icon kholo (terminal jaisa).
2. CloudShell me Actions -> Upload file -> `greenpoints.zip` upload karo.
3. Commands:
   ```
   unzip greenpoints.zip
   cd greenpoints/backend
   sam build
   sam deploy --guided
   ```
4. `sam deploy --guided` ke sawalon me:
   - Stack Name: `greenpoints`
   - Region: jo default dikhe (wahi rakho)
   - Confirm changes before deploy: `n`
   - Allow SAM CLI IAM role creation: `y`
   - Disable rollback: `n`
   - "may not have authorization defined, Is this okay?": `y` (feed aur leaderboard jaan boojh ke public hain)
   - Save arguments to configuration file: `y`
5. Deploy khatam hone par "Outputs" me 5 values aayengi: Region, ApiUrl, UserPoolId, UserPoolClientId, PhotosBucketName. Inhe copy kar lo.
   Dobara dekhne ke liye: `aws cloudformation describe-stacks --stack-name greenpoints --query "Stacks[0].Outputs"`

## 2. Frontend (apne Vite project me)
1. `frontend/src` ki saari files apne project ke `src` me copy karo (App.jsx aur index.css replace hongi, auth.js, api.js, photo.js, config.js nayi hongi).
2. Project root me (jahan package.json hai) `.env` file banao:
   ```
   VITE_REGION=<Region>
   VITE_CLIENT_ID=<UserPoolClientId>
   VITE_API_URL=<ApiUrl>
   ```
3. `npm run dev` chalao, `http://localhost:5173` kholo.

## 3. Test
1. Sign up (apni real email se, kyunki code email pe aata hai).
2. Code daalo, login ho jayega.
3. Ek activity chuno, uski sahi photo lagao, Post karo.
4. Galat photo (jaise selfie) se test karo, 422 message aana chahiye aur "photo check saw: ..." me labels dikhenge.

## 4. Label tuning
Rekognition ke labels photo ke hisaab se alag aate hain. Agar sahi photo reject ho jaye, to "saw" wali list note karo
aur `backend/src/catalog.mjs` me us activity ki `labels` list me add karo. Phir `sam build && sam deploy`.

## Delete karna ho to
`sam delete --stack-name greenpoints` (bucket me photos hongi to pehle unhe khali karna padega).
