require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const connectionString =
  process.env.DATABASE_URL ||
  process.env.SUPABASE_DB_URL ||
  process.env.POSTGRES_URL ||
  '';

if (!connectionString) {
  console.log('No DATABASE_URL detected. Skipping database setup.');
  process.exit(0);
}

const shouldUseSsl =
  !connectionString.includes('localhost') &&
  !connectionString.includes('127.0.0.1');

const pool = new Pool({
  connectionString,
  ssl: shouldUseSsl ? { rejectUnauthorized: false } : undefined,
});

async function main() {
  const schemaPath = path.join(__dirname, '..', 'db', 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');

  console.log('Applying database schema...');
  await pool.query(schema);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS catalyst_runtime_state (
      id TEXT PRIMARY KEY,
      payload JSONB NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(
    `INSERT INTO catalyst_runtime_state (id, payload)
     VALUES ($1, $2::jsonb)
     ON CONFLICT (id) DO NOTHING`,
    [
      'main',
      JSON.stringify({
        guildInstallations: {},
        seasons: {},
        memberships: {},
        consentRecords: {},
        events: {},
        summaries: {},
      }),
    ],
  );

  console.log('Database schema ready.');
}

main()
  .catch((error) => {
    console.error('Database setup failed.');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
