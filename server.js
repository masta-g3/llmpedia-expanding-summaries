const express = require('express');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Create PostgreSQL connection pool
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASS,
  port: process.env.DB_PORT,
  ssl: {
    rejectUnauthorized: false
  }
});

// Serve static files
app.use(express.static(path.join(__dirname)));

// API endpoints
// Get list of available papers that have summaries with method = 'full_text'
app.get('/api/papers', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT a.arxiv_code as arxiv_id, a.title, a.authors, a.published as published_date 
      FROM arxiv_details a
      INNER JOIN summary_notes s ON a.arxiv_code = s.arxiv_code
      WHERE s.method = 'full_text'
      ORDER BY a.published DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching papers:', error);
    res.status(500).json({ error: 'Failed to fetch papers' });
  }
});

// Get citation data for all papers
app.get('/api/citations', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        arxiv_code,
        citation_count,
        influential_citation_count
      FROM semantic_details
      WHERE citation_count > 0 OR influential_citation_count > 0
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching citation data:', error);
    res.status(500).json({ error: 'Failed to fetch citation data' });
  }
});

// Get paper details by ID
app.get('/api/paper/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT 
        arxiv_code as arxiv_id, 
        title, 
        authors, 
        published as published_date,
        summary as abstract,
        arxiv_comment
      FROM arxiv_details 
      WHERE arxiv_code = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Paper not found' });
    }
    
    // Get citation data if available
    try {
      console.log(`Fetching citation data for paper ${id}`);
      
      // First, let's try to find out the exact column names
      const columnsResult = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'semantic_details'
      `);
      
      const columns = columnsResult.rows.map(row => row.column_name);
      console.log('Columns in semantic_details:', columns);
      
      // Choose query based on column names
      let citationResult;
      if (columns.includes('citation_count') && columns.includes('influential_citation_count')) {
        citationResult = await pool.query(`
          SELECT 
            citation_count,
            influential_citation_count,
            venue,
            tldr
          FROM semantic_details
          WHERE arxiv_code = $1
        `, [id]);
      } else if (columns.includes('citations')) {
        // Alternative column name
        citationResult = await pool.query(`
          SELECT 
            citations as citation_count,
            influential_citations as influential_citation_count,
            venue,
            tldr
          FROM semantic_details
          WHERE arxiv_code = $1
        `, [id]);
      } else {
        // Just get all columns
        citationResult = await pool.query(`
          SELECT * FROM semantic_details
          WHERE arxiv_code = $1
        `, [id]);
      }
      
      console.log(`Citation result for ${id}:`, citationResult.rows);
      
      if (citationResult.rows.length > 0) {
        // Convert any null values to undefined to avoid issues
        const citationData = citationResult.rows[0];
        Object.keys(citationData).forEach(key => {
          if (citationData[key] === null) {
            citationData[key] = undefined;
          }
        });
        
        result.rows[0] = { ...result.rows[0], ...citationData };
        console.log('Citation data merged into response');
      } else {
        console.log('No citation data found for this paper');
      }
    } catch (error) {
      console.error('Error fetching citation data:', error);
      // Continue without citation data rather than failing the whole request
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching paper details:', error);
    res.status(500).json({ error: 'Failed to fetch paper details' });
  }
});

// Get paper summary by ID and paragraph length
app.get('/api/summary/:id/:paragraphs', async (req, res) => {
  try {
    const { id, paragraphs } = req.params;
    
    // Convert paragraphs to integer
    const numParagraphs = parseInt(paragraphs);
    
    // Query to find the closest available summary length with method = 'full_text'
    const summaryQuery = `
      SELECT summary as content, level 
      FROM summary_notes
      WHERE arxiv_code = $1 AND method = 'full_text'
      ORDER BY ABS(level - $2)
      LIMIT 1
    `;
    
    const result = await pool.query(summaryQuery, [id, numParagraphs]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Summary not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching summary:', error);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

// Serve index.html for the root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Validate database connection and check tables
app.get('/api/check-db', async (req, res) => {
  try {
    // Check if database is connected
    const connectionResult = await pool.query('SELECT NOW()');
    console.log('Database connection successful:', connectionResult.rows[0]);
    
    // Check if semantic_details table exists and has the right columns
    const tableResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'semantic_details'
    `);
    
    if (tableResult.rows.length > 0) {
      console.log('semantic_details table exists');
      
      // Check columns in semantic_details
      const columnResult = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'semantic_details'
      `);
      
      console.log('Columns in semantic_details:', columnResult.rows.map(row => row.column_name));
      
      // Check for sample data
      const sampleResult = await pool.query(`
        SELECT arxiv_code, citation_count, influential_citation_count 
        FROM semantic_details 
        LIMIT 5
      `);
      
      console.log('Sample citation data:', sampleResult.rows);
      
      res.json({
        connection: true,
        table_exists: true,
        columns: columnResult.rows.map(row => row.column_name),
        sample_data: sampleResult.rows
      });
    } else {
      console.log('semantic_details table does not exist');
      res.json({ connection: true, table_exists: false });
    }
  } catch (error) {
    console.error('Database check error:', error);
    res.status(500).json({ error: 'Database check failed', details: error.message });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});