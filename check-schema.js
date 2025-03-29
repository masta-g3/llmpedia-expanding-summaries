const { Pool } = require('pg');
require('dotenv').config();

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

async function checkSchema() {
  try {
    // Check connection
    const client = await pool.connect();
    console.log('Connected to database successfully!');
    
    // Get list of tables
    const tablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    
    console.log('\nAvailable tables:');
    tablesResult.rows.forEach(row => {
      console.log(`- ${row.table_name}`);
    });
    
    // Check arxiv_details schema
    console.log('\nChecking arxiv_details schema:');
    const arxivDetailsSchema = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'arxiv_details'
      ORDER BY ordinal_position;
    `);
    
    console.log('arxiv_details columns:');
    arxivDetailsSchema.rows.forEach(col => {
      console.log(`- ${col.column_name} (${col.data_type})`);
    });
    
    // Check summary_notes schema
    console.log('\nChecking summary_notes schema:');
    const summaryNotesSchema = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'summary_notes'
      ORDER BY ordinal_position;
    `);
    
    console.log('summary_notes columns:');
    summaryNotesSchema.rows.forEach(col => {
      console.log(`- ${col.column_name} (${col.data_type})`);
    });
    
    // Check semantic_details schema
    console.log('\nChecking semantic_details schema:');
    const semanticDetailsSchema = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'semantic_details'
      ORDER BY ordinal_position;
    `);
    
    console.log('semantic_details columns:');
    semanticDetailsSchema.rows.forEach(col => {
      console.log(`- ${col.column_name} (${col.data_type})`);
    });
    
    // Sample data from arxiv_details
    console.log('\nSample data from arxiv_details (1 row):');
    const arxivDetailsSample = await client.query(`
      SELECT * FROM arxiv_details LIMIT 1;
    `);
    console.log(arxivDetailsSample.rows[0]);
    
    // Sample data from summary_notes
    console.log('\nSample data from summary_notes (1 row):');
    const summaryNotesSample = await client.query(`
      SELECT * FROM summary_notes LIMIT 1;
    `);
    console.log(summaryNotesSample.rows[0]);
    
    // Release client
    client.release();
  } catch (error) {
    console.error('Error connecting to database:', error);
  } finally {
    // Close pool
    await pool.end();
  }
}

checkSchema();