require('dotenv').config();

const express = require('express');
const path = require('path');
const pool = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

async function initializeDatabase() {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS books (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      author VARCHAR(255) NOT NULL,
      comments TEXT DEFAULT ''
    );
  `;

  const countQuery = 'SELECT COUNT(*)::int AS count FROM books';

  try {
    await pool.query(createTableQuery);
    const result = await pool.query(countQuery);

    if (result.rows[0].count === 0) {
      await pool.query(
        `INSERT INTO books (title, author, comments)
         VALUES
           ($1, $2, $3),
           ($4, $5, $6),
           ($7, $8, $9)`,
        [
          'The Pragmatic Programmer', 'Andrew Hunt & David Thomas', 'Seed data row 1',
          'Clean Code', 'Robert C. Martin', 'Seed data row 2',
          'Designing Data-Intensive Applications', 'Martin Kleppmann', 'Seed data row 3'
        ]
      );
    }
  } catch (error) {
    console.error('Database initialization error:', error.message);
  }
}

app.get('/', (req, res) => {
  res.redirect('/books');
});

app.get('/books', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM books ORDER BY id ASC');
    res.render('data', {
      title: 'Books List',
      books: result.rows,
      message: req.query.message || ''
    });
  } catch (error) {
    res.status(500).render('error', {
      title: 'Error',
      errorMessage: 'Unable to load books.',
      errorDetail: error.message,
    });
  }
});

app.get('/books/add', (req, res) => {
  res.render('form', {
    title: 'Add Book',
    formTitle: 'Add a New Book',
    action: '/books/add',
    book: { title: '', author: '', comments: '' },
    submitLabel: 'Add Book'
  });
});

app.post('/books/add', async (req, res) => {
  const { title, author, comments } = req.body;

  try {
    await pool.query(
      'INSERT INTO books (title, author, comments) VALUES ($1, $2, $3)',
      [title, author, comments]
    );
    res.redirect('/books?message=Book added successfully');
  } catch (error) {
    res.status(500).render('error', {
      title: 'Error',
      errorMessage: 'Unable to add book.',
      errorDetail: error.message,
    });
  }
});

app.get('/books/edit/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM books WHERE id = $1', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).render('error', {
        title: 'Not Found',
        errorMessage: 'Book not found.',
        errorDetail: 'No row matched the provided ID.',
      });
    }

    res.render('form', {
      title: 'Edit Book',
      formTitle: 'Edit Book',
      action: `/books/edit/${req.params.id}`,
      book: result.rows[0],
      submitLabel: 'Update Book'
    });
  } catch (error) {
    res.status(500).render('error', {
      title: 'Error',
      errorMessage: 'Unable to load the edit form.',
      errorDetail: error.message,
    });
  }
});

app.post('/books/edit/:id', async (req, res) => {
  const { title, author, comments } = req.body;

  try {
    await pool.query(
      'UPDATE books SET title = $1, author = $2, comments = $3 WHERE id = $4',
      [title, author, comments, req.params.id]
    );
    res.redirect('/books?message=Book updated successfully');
  } catch (error) {
    res.status(500).render('error', {
      title: 'Error',
      errorMessage: 'Unable to update book.',
      errorDetail: error.message,
    });
  }
});

app.post('/books/delete/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM books WHERE id = $1', [req.params.id]);
    res.redirect('/books?message=Book deleted successfully');
  } catch (error) {
    res.status(500).render('error', {
      title: 'Error',
      errorMessage: 'Unable to delete book.',
      errorDetail: error.message,
    });
  }
});

app.use((req, res) => {
  res.status(404).render('error', {
    title: 'Not Found',
    errorMessage: 'Page not found.',
    errorDetail: 'Check the URL and try again.',
  });
});

initializeDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Server started (http://localhost:${PORT}/) !`);
  });
});
