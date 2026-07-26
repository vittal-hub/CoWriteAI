import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolves .env relative to this file (backend/.env), not process.cwd() —
// dotenv/config's default cwd-relative lookup silently finds nothing (and
// leaves env vars undefined) if the process is launched from any directory
// other than backend/, e.g. `node server.js` run from inside backend/src/.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
