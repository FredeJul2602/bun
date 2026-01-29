// ============================================
// Drizzle ORM Schema Definitions
// PostgreSQL tables for conversations and messages
// ============================================

import { pgTable, uuid, timestamp, text, jsonb, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ============================================
// Conversations Table
// ============================================
export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ============================================
// Messages Table
// ============================================
export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["user", "assistant", "system"] }).notNull(),
  content: text("content").notNull(),
  skillExecution: jsonb("skill_execution").$type<{
    skillName: string;
    input: Record<string, unknown>;
    output: unknown;
    executedAt: string;
  } | null>(),
  timestamp: timestamp("timestamp", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("idx_messages_conversation").on(table.conversationId),
]);

// ============================================
// Pending Requests Table (for async processing)
// ============================================
export const pendingRequests = pgTable("pending_requests", {
  id: text("id").primaryKey(),
  status: text("status", { enum: ["pending", "processing", "completed", "error"] }).notNull().default("pending"),
  conversationId: uuid("conversation_id")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  userMessage: text("user_message").notNull(),
  responseId: uuid("response_id").references(() => messages.id),
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("idx_pending_requests_status").on(table.status),
  index("idx_pending_requests_created").on(table.createdAt),
]);

// ============================================
// Relations (for Drizzle relational queries)
// ============================================
export const conversationsRelations = relations(conversations, ({ many }) => ({
  messages: many(messages),
  pendingRequests: many(pendingRequests),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
}));

export const pendingRequestsRelations = relations(pendingRequests, ({ one }) => ({
  conversation: one(conversations, {
    fields: [pendingRequests.conversationId],
    references: [conversations.id],
  }),
  response: one(messages, {
    fields: [pendingRequests.responseId],
    references: [messages.id],
  }),
}));

// ============================================
// Type Inference Helpers
// ============================================
export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type PendingRequestRow = typeof pendingRequests.$inferSelect;
export type NewPendingRequest = typeof pendingRequests.$inferInsert;
