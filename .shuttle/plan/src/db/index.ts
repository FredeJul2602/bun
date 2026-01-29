// ============================================
// Database Connection - Drizzle + postgres.js
// Provides db instance and schema exports
// ============================================

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Connection string from environment
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn("[DB] DATABASE_URL not set - database features will be disabled");
}

// Create postgres.js client with connection pool
const queryClient = connectionString
  ? postgres(connectionString, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
    })
  : null;

// Create Drizzle instance with schema for relational queries
export const db = queryClient ? drizzle(queryClient, { schema }) : null;

// Export schema for convenience
export * from "./schema";

// Helper to check if database is available
export function isDatabaseAvailable(): boolean {
  return db !== null;
}

// Graceful shutdown helper
export async function closeDatabaseConnection(): Promise<void> {
  if (queryClient) {
    await queryClient.end();
    console.log("[DB] Database connection closed");
  }
}
