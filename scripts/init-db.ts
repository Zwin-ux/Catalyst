/**
 * Database Initialization Script
 * 
 * This script initializes the Supabase database with required tables
 * Run with: npx ts-node scripts/init-db.ts
 */

import dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';

// Use the service_role key for admin/database scripts (dangerous: keep secret!). Use anon key for client/bot code.
function getEnvString(key: string, fallback?: string): string {
  const value = process.env[key];
  if (value === undefined || value === null || value === '') {
    if (fallback !== undefined) return fallback;
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

// For DB admin scripts, prefer SUPABASE_SERVICE_ROLE_KEY, fallback to SUPABASE_KEY (anon) if not set
const supabaseUrl = getEnvString('SUPABASE_URL');
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || getEnvString('SUPABASE_KEY');
const supabase = createClient(supabaseUrl, supabaseKey);

import fs from 'fs';
import path from 'path';
import { CONFIG } from '../config';

async function initializeDatabase() {
  // Load database schema
  const schemaPath = path.join(__dirname, '..', 'db', 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');

  console.log('🔌 Connecting to Supabase...');
  
  // Use the supabase client already created above (with correct key)
  // const supabase = createClient(
  //   CONFIG.SUPABASE_URL,
  //   CONFIG.SUPABASE_KEY
  // );

  try {
    console.log('🧪 Running database schema creation...');
    
    // Execute schema
    const { error } = await supabase.rpc('pg_execute', { 
      query_text: schema 
    });

    if (error) {
      console.error('❌ Error executing schema:', error);
      console.log('\nTrying alternative method with individual queries...');
      
      // Split schema into individual statements and execute one by one
      const statements = schema.split(';')
        .map(statement => statement.trim())
        .filter(statement => statement.length > 0);
      
      for (const statement of statements) {
        const { error } = await supabase.rpc('pg_execute', { 
          query_text: statement + ';' 
        });
        
        if (error) {
          console.error(`❌ Error executing statement: ${statement}`);
          console.error(error);
        }
      }
    } else {
      console.log('✅ Database schema created successfully!');
    }

    // Verify tables exist by querying for them
    const { data: tables, error: tableError } = await supabase
      .from('pg_tables')
      .select('tablename')
      .eq('schemaname', 'public');

    if (tableError) {
      console.warn('⚠️ Unable to verify tables:', tableError);
    } else {
      console.log('📋 Existing tables:');
      const tableNames = tables?.map(t => t.tablename) || [];
      
      const expectedTables = ['users', 'factions', 'drama_events', 'server_settings'];
      const missingTables = expectedTables.filter(t => !tableNames.includes(t));
      
      if (missingTables.length > 0) {
        console.warn(`⚠️ Missing tables: ${missingTables.join(', ')}`);
      } else if (tableNames.length >= expectedTables.length) {
        console.log('✅ All required tables exist!');
        console.log(tableNames.join(', '));
      }
    }

  } catch (err) {
    console.error('❌ Failed to initialize database:', err);
  }
}

// Run the initialization
initializeDatabase().catch(console.error);
