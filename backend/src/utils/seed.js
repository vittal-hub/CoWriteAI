import 'dotenv/config';
import connectDB from '../config/db.js';
import User from '../models/User.js';
import Document from '../models/Document.js';
import mongoose from 'mongoose';

const seed = async () => {
  await connectDB();

  console.log('[seed] Clearing existing demo data...');
  await Promise.all([User.deleteMany({}), Document.deleteMany({})]);

  const [alice, bob, carol] = await User.create([
    { name: 'Alice Chen', email: 'alice@example.com', password: 'password123' },
    { name: 'Bob Martinez', email: 'bob@example.com', password: 'password123' },
    { name: 'Carol Nguyen', email: 'carol@example.com', password: 'password123' },
  ]);

  await Document.create({
    title: 'Product Roadmap Q3',
    owner: alice._id,
    content: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Welcome to CollabNoteAI! Start typing to collaborate live.' }],
        },
      ],
    },
    collaborators: [
      { user: bob._id, permission: 'edit', invitedBy: alice._id },
      { user: carol._id, permission: 'view', invitedBy: alice._id },
    ],
  });

  await Document.create({
    title: 'Meeting Notes - Design Sync',
    owner: bob._id,
    collaborators: [{ user: alice._id, permission: 'edit', invitedBy: bob._id }],
  });

  console.log('[seed] Done. Demo accounts (password: password123):');
  console.log('  alice@example.com / bob@example.com / carol@example.com');

  await mongoose.connection.close();
  process.exit(0);
};

seed().catch((err) => {
  console.error('[seed] Failed:', err);
  process.exit(1);
});
