require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const connectDB = require('./config/db');
const { initSocket } = require('./socket');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Initialize Socket.io
initSocket(server);

// Middleware
app.use(cors());
app.use(express.json());

// Database Connection
connectDB();

// Routes (Placeholders for now)
app.get('/', (req, res) => res.send('API Running'));

// Import Routes
const alumniRoutes = require('./routes/alumni');
const mentorshipRoutes = require('./routes/mentorship');
const discussionRoutes = require('./routes/discussions');
const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/posts');
const connectionRoutes = require('./routes/connections');
const notificationRoutes = require('./routes/notifications');
const profileRoutes = require('./routes/profile');
const chatRoutes = require('./routes/chat');

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/connections', connectionRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/alumni', alumniRoutes);
app.use('/api/mentorship', mentorshipRoutes);
app.use('/api/discussions', discussionRoutes);
app.use('/api/chat', chatRoutes);

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
