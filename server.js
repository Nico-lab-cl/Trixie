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
  
  // Handle unexpected errors on idle clients to prevent crashing the server
  pool.on('error', (err) => {
    console.error('Unexpected error on idle database client:', err.message);
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

// Helper to generate responsive dark-mode optimized email HTML code
function generateEmailHtml(lead) {
  const { first_name, last_name, order_number, email, phone, jornada, tema, sugerencia } = lead;

  const temaLegible = {
    transparencia: 'Transparencia Financiera',
    beneficios: 'Salud y Convenios',
    comunicacion: 'Canales de Comunicación',
    derechos: 'Defensa y Código del Trabajo',
    otro: 'Otro Tema'
  }[tema] || tema;

  const jornadaLegible = {
    'full-time': 'Full Time',
    'media-jornada': 'Media Jornada',
    'part-time': 'Part Time'
  }[jornada] || jornada;

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirmación de Propuesta - Trixie Vega</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      background-color: #eed9ba;
      color: #1f2937;
    }
    .email-wrapper {
      width: 100%;
      background-color: #eed9ba;
      padding: 20px 0;
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
      border: 1px solid rgba(0, 0, 0, 0.05);
    }
    .email-header {
      background-color: #052c16;
      padding: 30px 20px;
      text-align: center;
      border-bottom: 4px solid #a3e635;
    }
    .email-header h1 {
      color: #ffffff;
      font-size: 24px;
      margin: 0;
      font-weight: 800;
      letter-spacing: 0.05em;
    }
    .email-header .subtitle {
      color: #a3e635;
      font-size: 14px;
      margin: 5px 0 0 0;
      font-weight: 700;
      letter-spacing: 0.1em;
    }
    .email-body {
      padding: 35px 25px;
      background-color: #ffffff;
    }
    .email-body h2 {
      color: #052c16;
      font-size: 20px;
      margin-top: 0;
      margin-bottom: 20px;
      font-weight: 700;
    }
    .email-body p {
      font-size: 16px;
      line-height: 1.6;
      margin-bottom: 24px;
      color: #4b5563;
    }
    .order-badge-container {
      text-align: center;
      margin-bottom: 24px;
    }
    .order-badge {
      display: inline-block;
      background-color: #f7fee7;
      border: 1px solid #bef264;
      color: #65a30d;
      font-size: 18px;
      font-weight: 800;
      padding: 10px 20px;
      border-radius: 8px;
    }
    .summary-box {
      background-color: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 24px;
    }
    .summary-box h3 {
      color: #052c16;
      font-size: 14px;
      margin-top: 0;
      margin-bottom: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .summary-item {
      font-size: 14px;
      line-height: 1.5;
      margin-bottom: 10px;
      color: #374151;
    }
    .summary-item strong {
      color: #052c16;
    }
    .summary-item:last-child {
      margin-bottom: 0;
    }
    .signature {
      border-top: 1px solid #e5e7eb;
      padding-top: 20px;
      margin-top: 30px;
    }
    .signature-name {
      font-size: 16px;
      font-weight: 700;
      color: #052c16;
      margin: 0;
    }
    .signature-title {
      font-size: 13px;
      color: #6b7280;
      margin: 2px 0 0 0;
    }
    .email-footer {
      background-color: #051d11;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: rgba(255, 255, 255, 0.5);
    }
    .email-footer a {
      color: #a3e635;
      text-decoration: none;
    }

    @media (prefers-color-scheme: dark) {
      body, .email-wrapper {
        background-color: #051d11 !important;
      }
      .email-container {
        background-color: #0c2619 !important;
        border-color: rgba(255, 255, 255, 0.08) !important;
      }
      .email-body {
        background-color: #0c2619 !important;
      }
      .email-body h2 {
        color: #a3e635 !important;
      }
      .email-body p {
        color: #eed9ba !important;
      }
      .order-badge {
        background-color: rgba(163, 230, 53, 0.1) !important;
        border-color: rgba(163, 230, 53, 0.3) !important;
        color: #a3e635 !important;
      }
      .summary-box {
        background-color: #051d11 !important;
        border-color: rgba(255, 255, 255, 0.08) !important;
      }
      .summary-box h3 {
        color: #a3e635 !important;
      }
      .summary-item {
        color: #eed9ba !important;
      }
      .summary-item strong {
        color: #ffffff !important;
      }
      .signature {
        border-top-color: rgba(255, 255, 255, 0.08) !important;
      }
      .signature-name {
        color: #ffffff !important;
      }
      .signature-title {
        color: rgba(255, 255, 255, 0.6) !important;
      }
      .email-footer {
        background-color: #050d08 !important;
        color: rgba(255, 255, 255, 0.4) !important;
      }
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="email-container">
      <div class="email-header">
        <h1>TRIXIE VEGA</h1>
        <div class="subtitle">Candidata a Secretaria Sindical 2026</div>
      </div>
      <div class="email-body">
        <h2>¡Hola, ${first_name}!</h2>
        <p>
          Te escribo para agradecerte personalmente por haber compartido tu inquietud y sugerencia a través de mi sitio de candidatura. Tu voz es fundamental para construir un sindicato más integrado, transparente e inclusivo para todos.
        </p>
        
        <div class="order-badge-container">
          <div class="order-badge">
            Orden N°: ${order_number}
          </div>
        </div>

        <div class="summary-box">
          <h3>Resumen de tu sugerencia</h3>
          <div class="summary-item"><strong>Nombre:</strong> ${first_name} ${last_name}</div>
          <div class="summary-item"><strong>Jornada Laboral:</strong> ${jornadaLegible}</div>
          <div class="summary-item"><strong>Tema de Preocupación:</strong> ${temaLegible}</div>
          <div class="summary-item" style="margin-top: 10px;">
            <strong>Sugerencia o Necesidad:</strong><br>
            <span style="font-style: italic; color: #6b7280; display: block; margin-top: 5px;">"${sugerencia}"</span>
          </div>
        </div>

        <p>
          Tus datos serán tratados de forma estrictamente confidencial. Estaré sumando tu realidad en tienda a mis propuestas de gestión para presentarlas en nuestras mesas de trabajo. ¡Porque cada socio cuenta!
        </p>

        <div class="signature">
          <p class="signature-name">Con cariño, Trixie Vega</p>
          <p class="signature-title">Candidata a Secretaria Sindical • Sindicato Falabella Viña Mall</p>
        </div>
      </div>
      <div class="email-footer">
        <p>Este correo electrónico fue generado para confirmar tu sugerencia en la campaña electoral.</p>
        <p>&copy; 2026 Campaña Trixie Vega. Todos los derechos reservados.</p>
      </div>
    </div>
  </div>
</body>
</html>`;
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

    // Build lead payload including email HTML and subject
    const leadPayload = {
      ...savedLead,
      email_subject: `🗳️ ¡Tu voz cuenta! Propuesta recibida (Orden ${savedLead.order_number})`,
      email_html: generateEmailHtml(savedLead)
    };

    // Forward to Webhook if defined
    const webhookUrl = process.env.WEBHOOK_URL || 'https://n8n-n8n.db8enk.easypanel.host/webhook/daa3bade-8682-4d77-8930-36d27ce08ca0';
    if (webhookUrl) {
      try {
        console.log(`Forwarding lead data to webhook: ${webhookUrl}`);
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(leadPayload)
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
