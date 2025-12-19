// backend/server.js
// Simple Express server to proxy Supabase API calls (avoids CORS)

import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
app.use(cors());
app.use(express.json());

// Proxy endpoint for Supabase Management API
app.post('/api/supabase/create-project', async (req, res) => {
  try {
    const { token, org_id, name, region, plan, db_pass } = req.body;

    const response = await fetch('https://api.supabase.com/v1/projects', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        organization_id: org_id,
        name,
        region: region || 'ap-southeast-2',
        plan: plan || 'free',
        db_pass,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Proxy for getting project status
app.get('/api/supabase/project/:ref', async (req, res) => {
  try {
    const { token } = req.query;
    const { ref } = req.params;

    const response = await fetch(
      `https://api.supabase.com/v1/projects/${ref}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Proxy for getting API keys
app.get('/api/supabase/project/:ref/api-keys', async (req, res) => {
  try {
    const { token } = req.query;
    const { ref } = req.params;

    const response = await fetch(
      `https://api.supabase.com/v1/projects/${ref}/api-keys`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Proxy for database queries
app.post('/api/supabase/project/:ref/database/query', async (req, res) => {
  try {
    const { token, query } = req.body;
    const { ref } = req.params;

    const response = await fetch(
      `https://api.supabase.com/v1/projects/${ref}/database/query`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      }
    );

    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Proxy server running on http://localhost:${PORT}`);
});
