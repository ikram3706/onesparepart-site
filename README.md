# OneSparePart site — with real Square checkout

## What changed from the single-file version
- `index.html` now uses Square's real hosted card field (Web Payments SDK) instead of plain text inputs.
- `api/process-payment.js` is a new serverless function that actually charges the card. It runs on Vercel's server, not in the browser.
- `package.json` tells Vercel to install the official `square` npm package for that function.

## One-time setup on Vercel

1. In your Vercel project, go to **Settings → Environment Variables**.
2. Add these two variables:
   - `SQUARE_ACCESS_TOKEN` = your Sandbox Access Token (from developer.squareup.com/apps — the **secret** one, not the Application ID)
   - `SQUARE_LOCATION_ID` = `LDRTW18JCYVAV`
3. Save, then redeploy the project so the new environment variables take effect.

## Deploying this folder

Because this project now includes a serverless function (the `api` folder), it needs to be deployed as a project folder rather than a single dragged-in file:

- **Easiest path:** create a free GitHub account (if you don't have one), create a new repository, and use GitHub's "Add file → Upload files" button to upload everything in this folder (`index.html`, `package.json`, the `api` folder). Then in Vercel, choose "Add New Project" → "Import Git Repository" and pick that repo. Your existing custom domain (1sparepart.com) can be re-attached to this new project the same way it was added before.
- Alternatively, if you're comfortable with a terminal, install the Vercel CLI (`npm i -g vercel`) and run `vercel` from inside this folder.

## Testing before going live

Use Square's official test card number to confirm everything works without charging a real card:

- Card number: `4111 1111 1111 1111`
- Expiry: any future date
- CVC: any 3 digits
- ZIP: any 5 digits

## Going live later

When you're ready to accept real cards:
1. Get your **Production** Application ID, Location ID, and Access Token from the same Square Developer dashboard (switch the toggle from Sandbox to Production).
2. Update `SQUARE_APP_ID` and `SQUARE_LOCATION_ID` in `index.html`, and the `SQUARE_ACCESS_TOKEN` / `SQUARE_LOCATION_ID` environment variables in Vercel.
3. Change the Square SDK script tag in `index.html` from `sandbox.web.squarecdn.com` to `web.squarecdn.com`.
4. Set `SQUARE_ENV=production` as an environment variable in Vercel (or just leave it off and default to Sandbox until you're ready).
