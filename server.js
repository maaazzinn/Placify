const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const session = require('express-session');
const fs = require('fs');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Setup middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));
app.use(session({
  secret: 'placify-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 3600000 } // 1 hour
}));

// Initialize SQLite database
const db = new sqlite3.Database('./placify.db', (err) => {
  if (err) {
    console.error('Error opening database', err);
  } else {
    console.log('Connected to SQLite database');
    initializeDatabase();
  }
});

// Create database tables if they don't exist
function initializeDatabase() {
  db.serialize(() => {
    // Create users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      reg_number TEXT UNIQUE,
      area_of_interest TEXT,
      is_admin INTEGER DEFAULT 0
    )`);

    // Create opportunities table
    db.run(`CREATE TABLE IF NOT EXISTS opportunities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      type TEXT NOT NULL,
      application_link TEXT NOT NULL,
      mock_test_link TEXT,
      deadline TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    // Create articles table
    db.run(`CREATE TABLE IF NOT EXISTS articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      file_path TEXT NOT NULL,
      uploaded_by INTEGER NOT NULL,
      uploaded_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(uploaded_by) REFERENCES users(id)
    )`);

    // Create admin user if it doesn't exist
    db.get(`SELECT * FROM users WHERE email = 'admin'`, (err, row) => {
      if (!row) {
        db.run(`INSERT INTO users (name, email, password, is_admin) VALUES (?, ?, ?, ?)`, 
          ['Admin', 'admin', 'admin123', 1]);
        console.log('Admin user created');
      }
    });
  });
}

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Authentication middleware for page routes (redirects to login)
function requireLogin(req, res, next) {
  if (req.session.user) {
    next();
  } else {
    res.redirect('/');
  }
}

// Authentication middleware for API routes (returns JSON)
function requireLoginApi(req, res, next) {
  if (req.session.user) {
    next();
  } else {
    res.status(401).json({ error: 'Authentication required' });
  }
}

// Admin middleware for API routes
function requireAdmin(req, res, next) {
  if (req.session.user && req.session.user.is_admin === 1) {
    next();
  } else {
    res.status(403).json({ error: 'Admin access required' });
  }
}

// Import routes
const authRoutes = require('./routes/auth');
const opportunitiesRoutes = require('./routes/opportunities');
const articlesRoutes = require('./routes/articles');

// Use route modules
app.use('/', authRoutes);
app.use('/opportunities', opportunitiesRoutes);
// Mount articles routes at root to match the route definitions in articlesRoutes
app.use('/', articlesRoutes);

// User info endpoint for frontend authentication checks
app.get('/user-info', (req, res) => {
  if (req.session.user) {
    res.json({ success: true, user: req.session.user });
  } else {
    res.status(401).json({ error: 'Not logged in' });
  }
});

// Serve views
app.get('/', (req, res) => {
  if (req.session.user) {
    return res.redirect('/dashboard');
  }
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.get('/dashboard', requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'dashboard.html'));
});

app.get('/add-opportunity', requireLogin, (req, res) => {
  if (!req.session.user.is_admin) {
    return res.redirect('/dashboard');
  }
  res.sendFile(path.join(__dirname, 'views', 'add-opportunity.html'));
});

app.get('/view-opportunities', requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'view-opportunities.html'));
});

app.get('/articles', requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'articles.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});