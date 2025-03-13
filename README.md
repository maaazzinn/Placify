# Placify - College Placement Portal

## Overview
Placify is a web-based college placement portal designed to connect students with placement and internship opportunities. It provides a platform for students to explore available opportunities, apply for placements and internships, and access academic articles. The portal also includes an admin dashboard for managing placements, internships, and articles.

## Features
- **User Authentication**: Secure signup and login for students and admins.
- **Admin Dashboard**: Manage placements, internships, and articles with ease.
- **Student Dashboard**: Access to view and apply for placements and internships, and read articles.
- **CRUD Operations**: Create, read, update, and delete functionalities for placements, internships, and articles.
- **File Uploads**: Support for uploading company posters and academic articles in PDF format.
- **Search & Filtering**: Easily search and filter through placements, internships, and articles.

## Tech Stack
- **Frontend**: HTML, CSS, JavaScript, Bootstrap
- **Backend**: Node.js, Express.js
- **Database**: SQLite

## Project Structure
```
Placify
├── models
│   ├── user.js
│   ├── placement.js
│   ├── internship.js
│   └── article.js
├── public
│   └── uploads
│       └── pdfs
├── routes
│   ├── auth.js
│   ├── opportunities.js
│   └── articles.js
├── views
│   ├── index.html
│   ├── dashboard.html
│   ├── add-opportunity
│   ├── view-opportunities
│   └── articles.html
├── package.json
├── server.js
└── README.md
```

## Setup Instructions
1. **Clone the Repository**: 
   ```
   [git clone <repository-url>](https://github.com/maaazzinn/Placify.git)
   cd Placify
   ```

2. **Install Dependencies**: 
   ```
   npm install
   ```

3. **Run the Application**: 
   ```
   node server.js
   ```

4. **Access the Portal**: Open your browser and navigate to `http://localhost:3000`.

