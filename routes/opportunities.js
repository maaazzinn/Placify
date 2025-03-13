const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./placify.db');

// Middleware to check if user is logged in
function requireLogin(req, res, next) {
  if (req.session.user) {
    next();
  } else {
    res.status(401).json({ error: 'You must be logged in' });
  }
}

// Middleware to check if user is admin
function requireAdmin(req, res, next) {
  if (req.session.user && req.session.user.is_admin) {
    next();
  } else {
    res.status(403).json({ error: 'Admin access required' });
  }
}

// Get all opportunities (filterable by type)
router.get('/', requireLogin, (req, res) => {
  const type = req.query.type;
  let query = `SELECT * FROM opportunities`;
  let params = [];
  
  if (type && (type === 'Placement' || type === 'Internship')) {
    query += ` WHERE type = ?`;
    params.push(type);
  }
  
  query += ` ORDER BY deadline DESC`;
  
  db.all(query, params, (err, opportunities) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ opportunities });
  });
});

// Add new opportunity (admin only)
router.post('/', requireLogin, requireAdmin, (req, res) => {
  const { title, description, type, applicationLink, mockTestLink, deadline } = req.body;
  
  if (!title || !description || !type || !applicationLink || !deadline) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  db.run(
    `INSERT INTO opportunities (title, description, type, application_link, mock_test_link, deadline) 
     VALUES (?, ?, ?, ?, ?, ?)`,
    [title, description, type, applicationLink, mockTestLink, deadline],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to add opportunity' });
      }
      res.json({ success: true, id: this.lastID });
    }
  );
});

// Delete opportunity (admin only)
router.delete('/:id', requireLogin, requireAdmin, (req, res) => {
  const id = req.params.id;
  
  db.run(`DELETE FROM opportunities WHERE id = ?`, [id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to delete opportunity' });
    }
    res.json({ success: true });
  });
});

module.exports = router;