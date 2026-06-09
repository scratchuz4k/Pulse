---
slug: cors-fix-railway-deploy
status: complete
---

# Fix CORS + Add Production Env

## Tasks

1. Fix CORS in `Pulse.Server/Program.cs` to allow:
   - `localhost` (dev)
   - Electron origins (`file://`, `app://`, null origin)
   - `https://pulse-production-50c0.up.railway.app`

2. Create `pulse-client/.env.production` with:
   - `VITE_SERVER_URL=https://pulse-production-50c0.up.railway.app`
