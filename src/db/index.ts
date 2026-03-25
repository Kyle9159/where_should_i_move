import Database from "better-sqlite3";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzleSqlite } from "drizzle-orm/better-sqlite3";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");

export const db = url.startsWith("file:")
	? drizzleSqlite(new Database(url.replace("file:", "")), { schema })
	: drizzleNeon(neon(url), { schema });

export type DB = typeof db;
