# 🚀 CoWriteAI

CoWriteAI is an AI-powered real-time collaborative document editor that enables multiple users to edit documents simultaneously with live cursors, AI-assisted rewriting, voice dictation, whiteboard drawing, comments, and secure document sharing.

🌐 **Live Demo:** https://cowriteai.netlify.app/

---

## ✨ Features

### 🤝 Real-Time Collaboration
- Live collaborative editing using WebSockets
- Live cursor and user presence
- Multi-user editing (supports up to 5 concurrent collaborators)
- Automatic document synchronization

### 🤖 AI Writing Assistant
- Grammar correction
- Tone rewriting
- Sentence improvement
- AI-powered content refinement
- Multiple rewrite modes (Formal, Friendly, Concise, Clarity)

### 🎙 Voice Dictation
- Speech-to-text document editing
- Continuous voice input
- Cursor-aware text insertion
- Browser Speech Recognition support

### ✏ Whiteboard / Drawing
- Draw directly inside documents
- Pencil tool
- Real-time drawing synchronization
- Collaborative whiteboard

### 💬 Comments
- Add comments to documents
- Reply to comments
- Resolve discussions

### 🔐 Authentication & Security
- JWT Authentication
- Secure password hashing
- Protected routes
- Cookie-based authentication
- Role-based document permissions

### 📁 Document Management
- Create documents
- Rename documents
- Delete documents
- Search documents
- Recent documents
- Auto-save

### 📤 Sharing
- Share documents with collaborators
- Permission management
- Real-time collaboration invitations

### 🎨 Modern UI
- Responsive design
- Dark / Light mode
- Mobile-friendly interface
- Smooth animations

---

# 🛠 Tech Stack

### Frontend
- React
- Vite
- Tailwind CSS
- TipTap Editor
- React Router
- Context API
- Axios
- Lucide Icons

### Backend
- Node.js
- Express.js
- MongoDB
- Mongoose
- WebSocket (ws)
- JWT Authentication
- bcryptjs

### AI
- OpenRouter API
- Google Gemini API

### Deployment
- Frontend: Netlify
- Backend: Render
- Database: MongoDB Atlas

---

# 📂 Project Structure

```
CoWriteAI
│
├── frontend
│   ├── src
│   ├── public
│   └── package.json
│
├── backend
│   ├── src
│   ├── controllers
│   ├── routes
│   ├── models
│   ├── middleware
│   ├── sockets
│   └── package.json
│
└── README.md
```

---

# ⚙ Installation

## Clone Repository

```bash
git clone https://github.com/vittal-hub/CoWriteAI.git

cd CoWriteAI
```

---

## Install Dependencies

### Frontend

```bash
cd frontend
npm install
```

### Backend

```bash
cd backend
npm install
```

---

# 🔑 Environment Variables

### Backend (.env)

```env
PORT=5000

NODE_ENV=development

MONGO_URI=your_mongodb_uri

JWT_SECRET=your_jwt_secret

CLIENT_URL=http://localhost:5173

OPENROUTER_API_KEY=your_openrouter_api_key

GEMINI_API_KEY=your_gemini_api_key
```

---

### Frontend (.env)

```env
VITE_API_URL=http://localhost:5000

VITE_WS_URL=ws://localhost:5000
```

---

# ▶ Running Locally

### Backend

```bash
cd backend
npm run dev
```

### Frontend

```bash
cd frontend
npm run dev
```

---

# 🌐 Production

Frontend:

```
https://cowriteai.netlify.app/
```

Backend:

```
https://cowriteai.onrender.com/
```

---

# 📸 Screenshots

> Add screenshots or GIFs here showing:

- Landing Page
- Dashboard
- Document Editor
- AI Rewrite
- Live Collaboration
- Voice Dictation
- Whiteboard
- Mobile View

---

# 🚀 Future Enhancements

- Document version history
- AI document summarization
- AI translation
- PDF annotation
- Offline editing
- Real-time presence indicators
- End-to-end encryption
- Rich export options
- Mobile application

---

# 🤝 Contributing

Contributions are welcome!

1. Fork the repository
2. Create a feature branch

```bash
git checkout -b feature-name
```

3. Commit your changes

```bash
git commit -m "Add feature"
```

4. Push your branch

```bash
git push origin feature-name
```

5. Open a Pull Request

---

# 📄 License

This project is licensed under the MIT License.

---

# 👨‍💻 Author

**Vittal Prasad**

- GitHub: https://github.com/vittal-hub
- LinkedIn: *(Add your LinkedIn profile here)*

---

⭐ If you found this project useful, consider giving it a **Star** on GitHub!
