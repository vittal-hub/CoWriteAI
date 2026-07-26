import './loadEnv.js';
import mongoose from 'mongoose';

const connectDB = async () => {
  const uri = process.env.MONGO_URI;

  // No silent fallback to a local database: a missing MONGO_URI must fail loudly,
  // not connect to whatever happens to be on 127.0.0.1:27017. A prior version of
  // this fallback masked a cwd-dependent dotenv loading bug — the server ran
  // successfully against the wrong database with no error anywhere in the logs.
  if (!uri) {
    console.error('[db] MONGO_URI is not set — refusing to start. Check backend/.env.');
    process.exit(1);
  }

  mongoose.set('strictQuery', true);

  try {
    const conn = await mongoose.connect(uri);
    console.log(`[db] MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
  } catch (err) {
    console.error(`[db] Connection error: ${err.message}`);
    process.exit(1);
  }

  mongoose.connection.on('disconnected', () => {
    console.warn('[db] MongoDB disconnected');
  });
};

export default connectDB;
