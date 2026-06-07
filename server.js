import express from 'express';
import cors from 'cors';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve static assets from Vite's build directory
app.use(express.static(path.join(__dirname, 'dist')));

// DB Pool configuration
const { Pool } = pg;
const dbUrl = process.env.DATABASE_URL;

let pool;
if (dbUrl) {
  pool = new Pool({
    connectionString: dbUrl,
    ssl: dbUrl.includes('sslmode=disable') ? false : { rejectUnauthorized: false }
  });
  
  // Test connection and run table initialization
  pool.query('SELECT NOW()')
    .then(async () => {
      console.log('Successfully connected to PostgreSQL.');
      try {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS trixie_leads (
              id SERIAL PRIMARY KEY,
              order_number VARCHAR(20) UNIQUE NOT NULL,
              first_name VARCHAR(100) NOT NULL,
              last_name VARCHAR(100) NOT NULL,
              email VARCHAR(255) NOT NULL,
              phone VARCHAR(50) NOT NULL,
              jornada VARCHAR(50) NOT NULL,
              tema VARCHAR(50) NOT NULL,
              sugerencia TEXT NOT NULL,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
        `);
        console.log('Database table "trixie_leads" is verified/initialized.');
      } catch (err) {
        console.error('Error creating trixie_leads table:', err);
      }
    })
    .catch(err => {
      console.error('PostgreSQL connection test failed:', err.message);
    });
} else {
  console.warn('WARNING: DATABASE_URL environment variable is not defined. Database features will run in demo/offline mode.');
}

// Helper to generate a unique random order number
function generateOrderNumber() {
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  return `TX-${randomNum}`;
}

// POST endpoint to register leads
app.post('/api/leads', async (req, res) => {
  const { first_name, last_name, email, phone, jornada, tema, sugerencia } = req.body;

  // Validation
  if (!first_name || !last_name || !email || !phone || !jornada || !tema || !sugerencia) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios.' });
  }

  const orderNumber = generateOrderNumber();

  let savedLead = null;

  try {
    if (pool) {
      const result = await pool.query(
        `INSERT INTO trixie_leads (order_number, first_name, last_name, email, phone, jornada, tema, sugerencia)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [orderNumber, first_name, last_name, email, phone, jornada, tema, sugerencia]
      );
      savedLead = result.rows[0];
      console.log(`Lead successfully saved in DB. Order Number: ${orderNumber}`);
    } else {
      // Offline/Demo mock fallback
      savedLead = {
        id: Date.now(),
        order_number: orderNumber,
        first_name,
        last_name,
        email,
        phone,
        jornada,
        tema,
        sugerencia,
        created_at: new Date().toISOString()
      };
      console.log(`[Demo Mode] Lead mocked and saved: ${orderNumber}`);
    }

    // Forward to Webhook if defined
    const webhookUrl = process.env.WEBHOOK_URL;
    if (webhookUrl) {
      try {
        console.log(`Forwarding lead data to webhook: ${webhookUrl}`);
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(savedLead)
        });
        
        if (response.ok) {
          console.log('Lead successfully forwarded to Webhook.');
        } else {
          console.error(`Webhook returned status: ${response.status}`);
        }
      } catch (webhookErr) {
        console.error('Failed to forward lead to webhook:', webhookErr.message);
      }
    } else {
      console.log('No WEBHOOK_URL environment variable set. Skipping webhook invocation.');
    }

    // Return the saved lead details to the frontend
    return res.status(201).json(savedLead);

  } catch (error) {
    console.error('Error inserting lead into DB:', error);
    return res.status(500).json({ error: 'Hubo un error al procesar tu solicitud. Por favor intenta más tarde.' });
  }
});

// Fallback: serve index.html for any other requests (SPA/Landing style)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
