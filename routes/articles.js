const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./placify.db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create uploads directory if it doesn't exist
const uploadDir = path.join(process.cwd(), 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for PDF uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Create a sanitized filename with timestamp to prevent overwriting
    const fileName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${Date.now()}-${fileName}`);
  }
});

// Set up file size limit (20MB) and file type restrictions
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 20 * 1024 * 1024 // 20MB
  },
  fileFilter: (req, file, cb) => {
    // Accept only PDF files
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

// Middleware to check if user is admin - we use this since server.js handles basic auth
function requireAdmin(req, res, next) {
  if (req.session && req.session.user && req.session.user.is_admin === 1) {
    next();
  } else {
    res.status(403).json({ error: 'Admin access required' });
  }
}

// Get all articles - accessible to all logged in users
// We don't need requireLoginApi here since server.js already checks authentication
router.get('/articles-list', (req, res) => {
  db.all(`SELECT * FROM articles ORDER BY uploaded_at DESC`, (err, articles) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error', details: err.message });
    }
    
    // Map the results to ensure file paths are correctly formatted
    const mappedArticles = articles.map(article => ({
      ...article,
      file_path: article.file_path.startsWith('/') ? article.file_path : `/${article.file_path}`
    }));
    
    res.json({ success: true, articles: mappedArticles });
  });
});

// Upload new article (admin only)
router.post('/articles', requireAdmin, (req, res) => {
  // Use multer upload as middleware with error handling
  const uploadMiddleware = upload.single('article');
  
  uploadMiddleware(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        // A Multer error occurred
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'File size exceeds the 20MB limit' });
        }
        return res.status(400).json({ error: `Upload error: ${err.message}` });
      } else {
        // An unknown error occurred
        return res.status(400).json({ error: err.message || 'Error uploading file' });
      }
    }
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded or invalid file type' });
    }
    
    const { title } = req.body;
    
    if (!title || !title.trim()) {
      // Delete uploaded file if title is missing
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({ error: 'Title is required' });
    }
    
    // Create a relative path from the public directory
    // Fix: Ensure the path always starts with a forward slash and uses correct separators for URLs
    let filePath = req.file.path.replace(path.join(process.cwd(), 'public'), '');
    
    // Normalize path for URLs (replace backslashes with forward slashes on Windows)
    filePath = filePath.replace(/\\/g, '/');
    
    // Ensure the path starts with a forward slash
    if (!filePath.startsWith('/')) {
      filePath = '/' + filePath;
    }
    
    db.run(
      `INSERT INTO articles (title, file_path, uploaded_by, uploaded_at) VALUES (?, ?, ?, datetime('now'))`,
      [title.trim(), filePath, req.session.user.id],
      function(err) {
        if (err) {
          console.error('Database insert error:', err);
          // Delete uploaded file if database insert fails
          fs.unlink(req.file.path, () => {});
          return res.status(500).json({ error: 'Failed to save article to database' });
        }
        
        res.json({ 
          success: true, 
          id: this.lastID,
          message: 'Article uploaded successfully'
        });
      }
    );
  });
});

// Delete article (admin only)
router.delete('/articles/:id', requireAdmin, (req, res) => {
  const id = req.params.id;
  
  if (!id || isNaN(parseInt(id))) {
    return res.status(400).json({ error: 'Invalid article ID' });
  }
  
  db.get(`SELECT file_path FROM articles WHERE id = ?`, [id], (err, article) => {
    if (err) {
      console.error('Database query error:', err);
      return res.status(500).json({ error: 'Database error', details: err.message });
    }
    
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }
    
    // Fix: Handle file paths correctly
    const filePath = path.join(process.cwd(), 'public', article.file_path.replace(/^\/+/, ''));
    
    db.run(`DELETE FROM articles WHERE id = ?`, [id], function(err) {
      if (err) {
        console.error('Database delete error:', err);
        return res.status(500).json({ error: 'Failed to delete article from database' });
      }
      
      // Delete the file
      fs.unlink(filePath, (err) => {
        if (err) {
          console.error('Error deleting file:', err);
          // Still return success even if file deletion fails
          // as the database record is already deleted
        }
        
        res.json({ 
          success: true,
          message: 'Article deleted successfully'
        });
      });
    });
  });
});

module.exports = router;