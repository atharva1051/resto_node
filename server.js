
const axios = require('axios');
const express = require('express');
const { Pool } = require('pg');
const Joi = require('joi');
const { authenticate } = require('./auth.js');
const jwt = require('jsonwebtoken');

const menuItemSchemapost = Joi.object({
  name: Joi.string().required(),
  price: Joi.number().positive().required(),
});

const menuItemSchemaput = Joi.object({
  price: Joi.number().positive().required(),
});


// Create a new pool instance
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'postgres',
  password: 'root',
  port: 5432, // Default PostgreSQL port
});

const app = express();
app.use(express.json());

// GET /menu - Get the restaurant menu
app.get('/menu', (req, res) => {
  pool.query('SELECT * FROM menu', (err, result) => {
    if (err) {
      console.error('Error executing query', err);
      res.status(500).json({ error: 'Internal server error' });
      return;
    }
    
    const menuItems = result.rows;
    res.json(menuItems);
  });
});





// // POST /menu - Add a new item to the menu
// app.post('/menu', (req, res) => {
//   const { name, price } = req.body;

//   pool.query('INSERT INTO menu (name, price) VALUES ($1, $2) RETURNING *', [name, price], (err) => {
//     if (err) {
//       console.error('Error executing query', err);
//       res.status(500).json({ error: 'Internal server error' });
//       return;
//     }

//     res.sendStatus(201);
//   });
// });

// POST /menu - Add a new item to the menu4
app.post('/menu',authenticate, (req, res) => {
  const { error } = menuItemSchemapost.validate(req.body);
  if (error) {
    res.status(400).json({ error: error.details[0].message });
    return;
  }

  const { name, price } = req.body;
  const Lname = name.toLowerCase();
  pool.query('INSERT INTO menu (name, price) VALUES ($1, $2) RETURNING *', [Lname, price], (err, result) => {
    if (err) {
      console.error('Error executing query', err);
      res.status(500).json({ error: 'Internal server error' });
      return;
    }

    const newItem = result.rows[0];
    res.status(201).json(newItem);
  });
});


// DELETE /menu/:id - Delete an item from the menu
app.delete('/menu/:name', authenticate, (req, res) => {
  const name = req.params.name;
  const Lname = name.toLowerCase();

  pool.query('DELETE FROM menu WHERE name = $1', [Lname], (err) => {
    if (err) {
      console.error('Error executing query', err);
      res.status(500).json({ error: 'Internal server error' });
      return;
    }

    res.sendStatus(200);
  });
});

// PUT /menu/:name - Update an item in the menu by providing its name
app.put('/menu/:name', authenticate, (req, res) => {
  const { error } = menuItemSchemaput.validate(req.body);

  if (error) {
    res.status(400).json({ error: error.details[0].message });
    return;
  }

  const name = req.params.name;
  const Lname = name.toLowerCase();
  const { price } = req.body;

  pool.query('UPDATE menu SET price = $1 WHERE name = $2 RETURNING *', [price, Lname], (err, result) => {
    if (err) {
      console.error('Error executing query', err);
      res.status(500).json({ error: 'Internal server error' });
      return;
    }

    const updatedItem = result.rows[0];
    if (!updatedItem) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }

    res.status(200).json(updatedItem);
  });
});

// POST endpoint for user login
app.post('/login', (req, res) => {
  // Retrieve the login credentials from the request body
  const { username, password } = req.body;

  // Perform authentication logic
  pool
    .query('SELECT * FROM users WHERE username = $1 AND password = $2', [username, password])
    .then((result) => {
      // Check if the provided credentials are valid
      if (result.rows.length === 1) {
        // Create the payload for the JWT token
        const payload = {
          username: result.rows[0].username,
          role: result.rows[0].role,
        };

        if(payload.role != "admin")
        res.status(401).json({ error: 'Invalid role' });

        // Generate the token
        
        const token = jwt.sign(payload, 'your_secret_key', { expiresIn: '1h' });
        // Return the token as the response
        res.json({ token });
      } else {
        // Return an error response for invalid credentials
        res.status(401).json({ error: 'Invalid credentials' });
      }
    })
    .catch((error) => {
      // Return an error response for any database error
      res.status(500).json({ error: 'Database error' });
    });
});

// Start the server
app.listen(3000, () => {
  console.log('Server is listening on port 3000');
});
