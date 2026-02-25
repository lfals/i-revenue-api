import { sqliteTable, text, } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const usersTable = sqliteTable("users_table", {
    id: text().primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: text().notNull(),
    email: text().notNull().unique(),
    password: text().notNull(),
    createdAt: text().default(sql`(CURRENT_TIMESTAMP)`)
});
