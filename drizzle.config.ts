import type { Config } from "drizzle-kit";

const url = process.env.DATABASE_URL ?? "file:./nexthome.db";
const isSqlite = url.startsWith("file:");

export default {
	schema: "./src/db/schema.ts",
	out: "./drizzle",
	dialect: isSqlite ? "sqlite" : "postgresql",
	...(isSqlite
		? { dbCredentials: { url: url.replace("file:", "") } }
		: { dbCredentials: { url } }),
} satisfies Config;
