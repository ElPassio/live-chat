import express from 'express';
import logger from 'morgan';
import path from 'path';
import { Server } from 'socket.io';
import { createServer } from 'node:http';
import mysql from 'mysql2';
import bcrypt from 'bcrypt';
import multer from 'multer';

const port = process.env.PORT ?? 3000;
const upload = multer({ dest: 'uploads/' });
const app = express();
const server = createServer(app);
const io = new Server(server, {
    connectionStateRecovery: {}
});

// Parse the MySQL URL
const dbUrl = new URL('mysql://root:XoXBAXmKQEGikrJYGFylikXBhRhwWNdt@viaduct.proxy.rlwy.net:22518/railway');
const connectedUsers = new Map();
const db = mysql.createConnection({
    host: dbUrl.hostname,
    port: dbUrl.port,
    user: dbUrl.username,
    password: dbUrl.password,
    database: dbUrl.pathname.split('/')[1],
    ssl: {
        rejectUnauthorized: false
    }
});
app.use(express.json()); // for parsing application/json
app.use('/uploads', express.static('uploads'));
app.use(express.urlencoded({ extended: true })); 
app.use(logger('dev'));
app.use(express.static(path.join(process.cwd(), 'client')));
db.connect((err) => {
    if (err) {
        console.error('Error connecting to the database:', err);
        return;
    }
    console.log('Connected to the database');
});

db.on('error', (err) => {
    console.error('Database error:', err);
    // Handle disconnection, reconnect, etc.
});

await db.execute(
    `CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    content TEXT,
    user TEXT
    )
`);
await db.promise().execute(
    `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTO_INCREMENT,
        username VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        display_name VARCHAR(255) NOT NULL
    )
`);
io.on('connection', async (socket) => {
    const username = socket.handshake.auth.username;
    let displayName = 'anonymous';
    let profilePicture = null;
    try {
        const [rows] = await db.promise().execute('SELECT display_name, profile_picture FROM users WHERE username = ?', [username]);
        if (rows.length > 0) {
            displayName = rows[0].display_name;
            profilePicture = rows[0].profile_picture;
        }
    } catch (err) {
        console.error('Error retrieving user data:', err);
    }

    socket.username = username;
    socket.displayName = displayName;
    socket.profilePicture = profilePicture;

    connectedUsers.set(username, { socket, displayName, profilePicture });
    io.emit('update user list', Array.from(connectedUsers.values()).map(user => ({ displayName: user.displayName, profilePicture: user.profilePicture })));

    socket.on('disconnect', () => {
        connectedUsers.delete(username);
        io.emit('update user list', Array.from(connectedUsers.values()).map(user => ({ displayName: user.displayName, profilePicture: user.profilePicture })));
    });

    socket.on('chat message', async (msg) => {
        if (typeof msg !== 'string') return;

        try {
            const [result] = await db.promise().execute('INSERT INTO messages (content, user) VALUES (?, ?)', [msg, username]);
            io.emit('chat message', msg, result.insertId.toString(), displayName, profilePicture);
        } catch (err) {
            console.error('Error inserting message:', err);
        }
    });

    if (!socket.recovered) {
        try {
            const [results] = await db.promise().execute(
                `SELECT messages.id, messages.content, users.display_name, users.profile_picture
                 FROM messages 
                 LEFT JOIN users ON messages.user = users.username
                 WHERE messages.id > ?`,
                [socket.handshake.auth.serverOffset ?? 0]
            );
            results.forEach(row => {
                socket.emit('chat message', row.content, row.id.toString(), row.display_name, row.profile_picture);
            });
        } catch (err) {
            console.error(err);
        }
    }
});
app.get('/', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'client/index.html'));
});
app.post('/register', upload.single('profilePicture'), async (req, res) => {
    const { username, password, displayName } = req.body;
    const profilePicture = req.file ? req.file.filename : null;

    if (!username || !password || !displayName) {
        return res.status(400).send('Username, password, and display name are required');
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await db.promise().execute(
            'INSERT INTO users (username, password, display_name, profile_picture) VALUES (?, ?, ?, ?)',
            [username, hashedPassword, displayName, profilePicture]
        );
        res.status(200).send('Registration successful');
    } catch (err) {
        console.error('Error during registration:', err);
        res.status(500).send('Server error');
    }
});
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).send('Username and password are required');
    }

    db.execute('SELECT * FROM users WHERE username = ?', [username], async (err, results) => {
        if (err) return res.status(500).send('Server error');
        if (results.length === 0) return res.status(400).send('Invalid username or password');

        const user = results[0];
        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(400).send('Invalid username or password');

        // Enviar respuesta exitosa
        res.status(200).send('Login successful');
    });
});

server.listen(port, () => {
    console.log(`Server running on port ${port}`);
});