const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./placify.db');

// Login route
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  
  db.get(`SELECT * FROM users WHERE email = ? AND password = ?`, [email, password], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    req.session.user = user;
    res.json({ success: true, isAdmin: user.is_admin });
  });
});

// Signup route
router.post('/signup', (req, res) => {
  const { name, email, password, regNumber, areaOfInterest } = req.body;
  
  db.get(`SELECT * FROM users WHERE email = ?`, [email], (err, existingUser) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (existingUser) {
      return res.status(400).json({ error: 'Email already in use' });
    }
    
    db.run(
      `INSERT INTO users (name, email, password, reg_number, area_of_interest) VALUES (?, ?, ?, ?, ?)`,
      [name, email, password, regNumber, areaOfInterest],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to register user' });
        }
        
        db.get(`SELECT * FROM users WHERE id = ?`, [this.lastID], (err, user) => {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }
          
          req.session.user = user;
          res.json({ success: true, isAdmin: false });
        });
      }
    );
  });
});

// Logout route
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

// Get current user info
router.get('/user-info', (req, res) => {
  if (req.session.user) {
    res.json({ user: req.session.user });
  } else {
    res.status(401).json({ error: 'Not logged in' });
  }
});

module.exports = router;