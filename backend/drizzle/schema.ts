import { bigint, boolean, jsonb, pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core';

export const botStates = pgTable('bot_states', {
	key: varchar('key', { length: 255 }).primaryKey(),
	state: jsonb('state').notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }),
	updatedAt: timestamp('updated_at', { withTimezone: true })
});

export const alphaMarketStatus = pgTable('alpha_market_status', {
	marketAppId: bigint('market_app_id', { mode: 'number' }).primaryKey(),
	marketId: text('market_id'),
	slug: text('slug'),
	status: text('status'),
	isLive: boolean('is_live'),
	isResolved: boolean('is_resolved'),
	isClosed: boolean('is_closed'),
	endTs: bigint('end_ts', { mode: 'number' }),
	closeTime: timestamp('close_time', { withTimezone: true }),
	lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
	createdAt: timestamp('created_at', { withTimezone: true }),
	updatedAt: timestamp('updated_at', { withTimezone: true })
});
