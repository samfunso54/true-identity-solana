

# Verified Digital Identity (Anti-Deepfake) on Solana

A full-prototype platform where users verify their identity via webcam liveness detection, authenticate with Solana wallets, and developers integrate verification via API.

---

## Pages & Navigation

### 1. Landing Page
- Hero section explaining the product: "Prove you're human. On-chain."
- How it works (3-step visual: Connect Wallet → Liveness Check → Get Verified)
- For Developers section with API integration highlights
- CTA buttons: "Get Verified" and "Developer Docs"

### 2. Wallet Connect & Auth
- Connect wallet via Phantom/Solflare using `@solana/wallet-adapter`
- Once connected, user sees their wallet address and verification status
- Redirect to verification flow if not yet verified

### 3. Verification Flow (Webcam Liveness Check)
- Step-by-step guided flow:
  1. **Camera permission** — request webcam access
  2. **Liveness challenge** — prompt user to perform actions (blink, turn head left/right, smile) with real-time webcam feed
  3. **Processing** — simulated anti-deepfake analysis with progress animation
  4. **Result** — verified or failed, with option to retry
- Uses browser `getUserMedia` API for webcam
- Visual indicators for each challenge step

### 4. User Dashboard
- Verification status badge (Verified / Pending / Not Verified)
- Wallet address display
- Verification history/timestamp
- Shareable verification link/badge

### 5. Developer Dashboard
- API key generation (simulated)
- API documentation with code examples (cURL, JavaScript, Python)
- Usage stats (mock data)
- Endpoint reference:
  - `GET /api/verify/{wallet_address}` — check verification status
  - `POST /api/verify/initiate` — start verification session

### 6. API Documentation Page
- Interactive API reference with request/response examples
- Integration guide with copy-paste code snippets
- Rate limits and pricing tiers (free tier highlighted)

---

## Key Features
- **Solana wallet auth** via `@solana/wallet-adapter-react` (Phantom, Solflare)
- **Webcam liveness detection UI** with challenge prompts (blink, head turn)
- **Verification status** stored in local state (upgradeable to on-chain/backend later)
- **Developer API docs** with mock endpoints and code samples
- **Responsive design** — works on desktop and mobile
- **Dark theme** with a trust/security-focused aesthetic (deep navy + green accents)

---

## Design
- Dark navy background with green/teal accent colors for "verified" states
- Clean, modern UI inspired by security/fintech products
- Glassmorphism cards for the dashboard
- Smooth animations for the verification flow

