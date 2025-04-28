import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.SUPABASE_URL,
  ssl: process.env.SUPABASE_URL ? { rejectUnauthorized: false } : undefined
});

export default pool;
