// All data here simulates what would normally come from a backend.
// Swap these for real API calls once the server exists.

export const currentUser = {
  id: 'u0',
  name: 'You',
  email: 'you@collabnote.ai',
  penIndex: 0,
  initials: 'Y',
}

export const people = [
  { id: 'u1', name: 'Meera Iyer', email: 'meera@studio.io', penIndex: 1, initials: 'MI' },
  { id: 'u2', name: 'Devansh Rao', email: 'devansh@studio.io', penIndex: 2, initials: 'DR' },
  { id: 'u3', name: 'Priya Nair', email: 'priya@studio.io', penIndex: 3, initials: 'PN' },
  { id: 'u4', name: 'Arjun Mehta', email: 'arjun@studio.io', penIndex: 4, initials: 'AM' },
]

const now = Date.now()
const minutesAgo = (m) => new Date(now - m * 60000).toISOString()

export const initialDocuments = [
  {
    id: 'd1',
    title: 'Q3 Product Roadmap',
    owner: currentUser.id,
    updatedAt: minutesAgo(6),
    createdAt: minutesAgo(60 * 24 * 5),
    sharedWith: [people[0], people[1]],
    starred: true,
    preview: 'Three workstreams for the quarter: onboarding revamp, offline sync, and the mobile editor rebuild.',
    content:
      '<h2>Q3 Product Roadmap</h2><p>Three workstreams for the quarter: <strong>onboarding revamp</strong>, <strong>offline sync</strong>, and the mobile editor rebuild.</p><p>Owner: Product. Reviewed with design on Tuesday.</p><ul><li>Ship offline-first sync engine</li><li>Redesign first-run onboarding</li><li>Prototype voice-to-text in editor</li></ul>',
  },
  {
    id: 'd2',
    title: 'Design Crit Notes — Editor Toolbar',
    owner: people[0].id,
    updatedAt: minutesAgo(24),
    createdAt: minutesAgo(60 * 24 * 12),
    sharedWith: [currentUser, people[2]],
    starred: false,
    preview: 'Toolbar felt cluttered with 14 icons. Proposal: collapse formatting into a floating menu.',
    content:
      '<h2>Design Crit — Editor Toolbar</h2><p>Toolbar felt cluttered with 14 icons. Proposal: collapse formatting into a floating menu that appears on text selection.</p><p>Keep pencil, text, mic and AI rewrite always visible — those are the four things people reach for constantly.</p>',
  },
  {
    id: 'd3',
    title: 'Hiring Plan — Design Team',
    owner: currentUser.id,
    updatedAt: minutesAgo(60 * 3),
    createdAt: minutesAgo(60 * 24 * 20),
    sharedWith: [],
    starred: false,
    preview: 'Two open roles: senior product designer and a design technologist for the canvas team.',
    content:
      '<h2>Hiring Plan — Design Team</h2><p>Two open roles: senior product designer and a design technologist for the canvas team.</p>',
  },
  {
    id: 'd4',
    title: 'Voice Notes — User Interviews (Batch 4)',
    owner: people[3].id,
    updatedAt: minutesAgo(60 * 8),
    createdAt: minutesAgo(60 * 24 * 2),
    sharedWith: [currentUser, people[0], people[1], people[2]],
    starred: true,
    preview: 'Recurring theme: people want to sketch on top of meeting notes without switching apps.',
    content:
      '<h2>User Interviews — Batch 4</h2><p>Recurring theme: people want to sketch on top of meeting notes without switching apps.</p><p>Quote: "I end up screenshotting the doc just to draw an arrow on it."</p>',
  },
  {
    id: 'd5',
    title: 'Launch Checklist',
    owner: currentUser.id,
    updatedAt: minutesAgo(60 * 30),
    createdAt: minutesAgo(60 * 24 * 40),
    sharedWith: [people[1]],
    starred: false,
    preview: 'Marketing, support macros, status page copy, and rollback plan — all need sign-off by Friday.',
    content:
      '<h2>Launch Checklist</h2><p>Marketing, support macros, status page copy, and rollback plan — all need sign-off by Friday.</p>',
  },
]

export const initialComments = {
  d1: [
    {
      id: 'c1',
      author: people[0],
      text: 'Should offline sync ship before or alongside the mobile rebuild? Feels risky to do both at once.',
      createdAt: minutesAgo(50),
      anchor: 'offline sync',
      resolved: false,
      replies: [
        {
          id: 'c1r1',
          author: currentUser,
          text: 'Alongside — the mobile rebuild depends on the same sync engine underneath.',
          createdAt: minutesAgo(40),
        },
      ],
    },
    {
      id: 'c2',
      author: people[1],
      text: 'Can we get a rough T-shirt size on the voice-to-text prototype?',
      createdAt: minutesAgo(15),
      anchor: 'voice-to-text',
      resolved: false,
      replies: [],
    },
  ],
  d2: [
    {
      id: 'c3',
      author: people[2],
      text: 'Agreed on collapsing the toolbar. Keep the pencil visible though — I reach for it constantly.',
      createdAt: minutesAgo(80),
      anchor: null,
      resolved: true,
      replies: [],
    },
  ],
}

export const initialNotifications = [
  {
    id: 'n1',
    type: 'comment',
    text: 'Meera Iyer commented on "Q3 Product Roadmap"',
    doc: 'd1',
    read: false,
    createdAt: minutesAgo(15),
  },
  {
    id: 'n2',
    type: 'share',
    text: 'Arjun Mehta shared "Voice Notes — User Interviews (Batch 4)" with you',
    doc: 'd4',
    read: false,
    createdAt: minutesAgo(60 * 7),
  },
  {
    id: 'n3',
    type: 'edit',
    text: 'Devansh Rao is editing "Q3 Product Roadmap" right now',
    doc: 'd1',
    read: true,
    createdAt: minutesAgo(6),
  },
  {
    id: 'n4',
    type: 'comment',
    text: 'Priya Nair resolved a comment on "Design Crit Notes"',
    doc: 'd2',
    read: true,
    createdAt: minutesAgo(80),
  },
]
