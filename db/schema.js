import { mysqlTable, varchar, int, boolean, timestamp, text } from 'drizzle-orm/mysql-core';

export const users = mysqlTable('users', {
  id: int('id').autoincrement().primaryKey(),
  username: varchar('username', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }),
  githubId: int('github_id').unique(),
  googleId: varchar('google_id', { length: 255 }).unique(),
  avatarUrl: varchar('avatar_url', { length: 255 }),
});

export const lessons = mysqlTable('lessons', {
  id: int('id').autoincrement().primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  videoUrl: varchar('video_url', { length: 255 }).notNull(),
  duration: int('duration').default(0), // Duración en segundos (para cálculos fáciles)
  order: int('order').notNull(),
});

export const progress = mysqlTable('progress', {
  id: int('id').autoincrement().primaryKey(),
  userId: int('user_id').notNull(),
  lessonId: int('lesson_id').notNull(),
  completed: boolean('completed').default(false),
  completedAt: timestamp('completed_at').defaultNow(),
});

export const resources = mysqlTable('resources', {
  id: int('id').autoincrement().primaryKey(),
  lessonId: int('lesson_id').notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description').notNull(),
  type: varchar('type', { length: 50 }).default('code'), // 'code', 'file', etc.
});
