import { sql } from 'drizzle-orm';
import {
  pgTable,
  pgEnum,
  uuid,
  text,
  varchar,
  boolean,
  integer,
  bigint,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
  unique,
  check,
  primaryKey,
  foreignKey,
} from 'drizzle-orm/pg-core';
import type {
  ScoringConfig,
  AggregateResult,
} from '../../lib/validation/results';
const id = () => uuid('id').defaultRandom().primaryKey();
const time = (name: string) => timestamp(name, { withTimezone: true });
const dates = () => ({
  createdAt: time('created_at').defaultNow().notNull(),
  updatedAt: time('updated_at').defaultNow().notNull(),
});
export const localeEnum = pgEnum('locale', ['en', 'uk', 'fr']);
export const roleEnum = pgEnum('role', ['user', 'moderator', 'admin']);
export const versionState = pgEnum('version_state', [
  'DRAFT',
  'PENDING',
  'PUBLISHED',
  'REJECTED',
]);
export const roomState = pgEnum('room_state', [
  'LOBBY',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'EXPIRED',
]);
export const questionKind = pgEnum('question_kind', [
  'SINGLE',
  'MULTIPLE',
  'SCALE',
  'TEXT',
  'YES_NO_MAYBE',
  'SINGLE_CHOICE',
  'MULTIPLE_CHOICE',
]);
export const attemptState = pgEnum('attempt_state', [
  'IN_PROGRESS',
  'SUBMITTED',
]);
export const reviewState = pgEnum('review_state', [
  'PENDING',
  'APPROVED',
  'REJECTED',
]);
export const user = pgTable(
  'users',
  {
    id: id(),
    name: varchar('name', { length: 80 }).notNull(),
    email: varchar('email', { length: 254 }).notNull().unique(),
    emailVerified: boolean('email_verified').default(false).notNull(),
    image: text('image'),
    role: roleEnum('role').default('user').notNull(),
    locale: localeEnum('locale').default('en').notNull(),
    ...dates(),
  },
  (t) => [check('normalized_email', sql`${t.email}=lower(${t.email})`)],
);
export const session = pgTable(
  'auth_sessions',
  {
    id: id(),
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    token: text('token').notNull().unique(),
    expiresAt: time('expires_at').notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    ...dates(),
  },
  (t) => [
    index('session_user_idx').on(t.userId),
    index('session_expiry_idx').on(t.expiresAt),
  ],
);
export const account = pgTable(
  'auth_accounts',
  {
    id: id(),
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    password: text('password'),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: time('access_token_expires_at'),
    refreshTokenExpiresAt: time('refresh_token_expires_at'),
    scope: text('scope'),
    ...dates(),
  },
  (t) => [
    unique('account_provider_unique').on(t.providerId, t.accountId),
    index('account_user_idx').on(t.userId),
  ],
);
export const verification = pgTable(
  'verification_tokens',
  {
    id: id(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: time('expires_at').notNull(),
    ...dates(),
  },
  (t) => [
    uniqueIndex('verification_identifier_idx').on(t.identifier),
    index('verification_expiry_idx').on(t.expiresAt),
  ],
);
export const rateLimit = pgTable('auth_rate_limits', {
  id: id(),
  key: text('key').notNull().unique(),
  count: integer('count').notNull(),
  lastRequest: bigint('last_request', { mode: 'number' }).notNull(),
});
export const categories = pgTable('categories', {
  id: id(),
  slug: varchar('slug', { length: 60 }).notNull().unique(),
  adultOnly: boolean('adult_only').default(false).notNull(),
  ...dates(),
});
export const categoryCopy = pgTable(
  'category_copy',
  {
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'cascade' }),
    locale: localeEnum('locale').notNull(),
    name: varchar('name', { length: 120 }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.categoryId, t.locale] })],
);
export const tags = pgTable('tags', {
  id: id(),
  slug: varchar('slug', { length: 60 }).notNull().unique(),
  ...dates(),
});
export const tagCopy = pgTable(
  'tag_copy',
  {
    tagId: uuid('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
    locale: localeEnum('locale').notNull(),
    name: varchar('name', { length: 120 }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.tagId, t.locale] })],
);
export const quizzes = pgTable(
  'quizzes',
  {
    id: id(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    slug: varchar('slug', { length: 100 }).notNull().unique(),
    ...dates(),
  },
  (t) => [index('quiz_owner_idx').on(t.ownerId)],
);
export const quizVersions = pgTable(
  'quiz_versions',
  {
    id: id(),
    quizId: uuid('quiz_id')
      .notNull()
      .references(() => quizzes.id, { onDelete: 'restrict' }),
    version: integer('version').notNull(),
    status: versionState('status').default('DRAFT').notNull(),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id),
    adultOnly: boolean('adult_only').default(false).notNull(),
    revision: integer('revision').default(0).notNull(),
    approved: boolean('approved').default(false).notNull(),
    official: boolean('official').default(false).notNull(),
    featured: boolean('featured').default(false).notNull(),
    archived: boolean('archived').default(false).notNull(),
    coverId: uuid('cover_id').references(() => mediaAssets.id),
    scoringConfig: jsonb('scoring_config').$type<ScoringConfig>().notNull(),
    publishedAt: time('published_at'),
    ...dates(),
  },
  (t) => [
    unique('quiz_version_unique').on(t.quizId, t.version),
    check('positive_version', sql`${t.version}>0`),
    check(
      'published_date',
      sql`(${t.status}='PUBLISHED')=(${t.publishedAt} IS NOT NULL)`,
    ),
    index('catalog_idx').on(t.status, t.categoryId, t.publishedAt),
  ],
);
export const quizCopy = pgTable(
  'quiz_copy',
  {
    versionId: uuid('version_id')
      .notNull()
      .references(() => quizVersions.id, { onDelete: 'cascade' }),
    locale: localeEnum('locale').notNull(),
    title: varchar('title', { length: 160 }).notNull(),
    description: varchar('description', { length: 2000 }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.versionId, t.locale] })],
);
export const quizTags = pgTable(
  'quiz_tags',
  {
    versionId: uuid('version_id')
      .notNull()
      .references(() => quizVersions.id, { onDelete: 'cascade' }),
    tagId: uuid('tag_id')
      .notNull()
      .references(() => tags.id),
  },
  (t) => [
    primaryKey({ columns: [t.versionId, t.tagId] }),
    index('quiz_tag_filter_idx').on(t.tagId),
  ],
);
export const questions = pgTable(
  'questions',
  {
    id: id(),
    versionId: uuid('version_id')
      .notNull()
      .references(() => quizVersions.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    kind: questionKind('kind').notNull(),
    stableId: uuid('stable_id').defaultRandom().notNull(),
    category: varchar('category', { length: 60 })
      .default('connection')
      .notNull(),
    weight: integer('weight').default(1).notNull(),
    minSelections: integer('min_selections').default(1).notNull(),
    maxSelections: integer('max_selections').default(1).notNull(),
    imageId: uuid('image_id').references(() => mediaAssets.id),
    required: boolean('required').default(true).notNull(),
    scaleMin: integer('scale_min'),
    scaleMax: integer('scale_max'),
    ...dates(),
  },
  (t) => [
    unique('question_stable_version_unique').on(t.versionId, t.stableId),
    check('question_weight', sql`${t.weight} BETWEEN 0 AND 10`),
    check(
      'question_selections',
      sql`${t.minSelections}>=1 AND ${t.maxSelections}>=${t.minSelections} AND ${t.maxSelections}<=12`,
    ),
    unique('question_order_unique').on(t.versionId, t.position),
    unique('question_version_unique').on(t.id, t.versionId),
    check('question_position', sql`${t.position}>=0`),
    check(
      'question_scale',
      sql`(${t.kind}='SCALE' AND ${t.scaleMin} IS NOT NULL AND ${t.scaleMax} IS NOT NULL AND ${t.scaleMin}<${t.scaleMax}) OR (${t.kind}<>'SCALE' AND ${t.scaleMin} IS NULL AND ${t.scaleMax} IS NULL)`,
    ),
  ],
);
export const questionCopy = pgTable(
  'question_copy',
  {
    questionId: uuid('question_id')
      .notNull()
      .references(() => questions.id, { onDelete: 'cascade' }),
    locale: localeEnum('locale').notNull(),
    prompt: varchar('prompt', { length: 2000 }).notNull(),
    help: varchar('help', { length: 1000 }),
  },
  (t) => [primaryKey({ columns: [t.questionId, t.locale] })],
);
export const questionOptions = pgTable(
  'question_options',
  {
    id: id(),
    questionId: uuid('question_id')
      .notNull()
      .references(() => questions.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    value: varchar('value', { length: 100 }).notNull(),
    ...dates(),
  },
  (t) => [
    unique('option_order_unique').on(t.questionId, t.position),
    unique('option_value_unique').on(t.questionId, t.value),
    unique('option_question_unique').on(t.id, t.questionId),
    check('option_position', sql`${t.position}>=0`),
  ],
);
export const optionCopy = pgTable(
  'option_copy',
  {
    optionId: uuid('option_id')
      .notNull()
      .references(() => questionOptions.id, { onDelete: 'cascade' }),
    locale: localeEnum('locale').notNull(),
    label: varchar('label', { length: 500 }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.optionId, t.locale] })],
);
export const rooms = pgTable(
  'rooms',
  {
    id: id(),
    code: varchar('code', { length: 8 }).notNull(),
    versionId: uuid('version_id')
      .notNull()
      .references(() => quizVersions.id),
    hostUserId: uuid('host_user_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    hostParticipantId: uuid('host_participant_id'),
    status: roomState('status').default('LOBBY').notNull(),
    capacity: integer('capacity').default(10).notNull(),
    startedAt: time('started_at'),
    completedAt: time('completed_at'),
    expiresAt: time('expires_at').notNull(),
    ...dates(),
  },
  (t) => [
    unique('room_version_unique').on(t.id, t.versionId),
    uniqueIndex('active_room_code_idx')
      .on(t.code)
      .where(sql`${t.status} IN ('LOBBY','IN_PROGRESS')`),
    check('room_code_format', sql`${t.code} ~ '^[A-Z2-9]{8}$'`),
    check('room_capacity', sql`${t.capacity} BETWEEN 2 AND 10`),
    check(
      'room_retention',
      sql`${t.expiresAt} <= ${t.createdAt} + interval '7 days' AND ${t.expiresAt}>${t.createdAt}`,
    ),
    index('room_expiry_idx').on(t.expiresAt),
    index('room_host_idx').on(t.hostUserId, t.status),
  ],
);
export const participants = pgTable(
  'participants',
  {
    id: id(),
    roomId: uuid('room_id')
      .notNull()
      .references(() => rooms.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').references(() => user.id, { onDelete: 'set null' }),
    nickname: varchar('nickname', { length: 40 }).notNull(),
    credentialHash: varchar('credential_hash', { length: 64 })
      .notNull()
      .unique(),
    revokedAt: time('revoked_at'),
    expiresAt: time('expires_at').notNull(),
    ...dates(),
  },
  (t) => [
    unique('participant_room_unique').on(t.id, t.roomId),
    uniqueIndex('room_registered_participant_idx')
      .on(t.roomId, t.userId)
      .where(sql`${t.userId} IS NOT NULL`),
    index('participant_expiry_idx').on(t.expiresAt),
    check(
      'credential_hash_format',
      sql`${t.credentialHash} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      'participant_retention',
      sql`${t.expiresAt}<=${t.createdAt}+interval '7 days' AND ${t.expiresAt}>${t.createdAt}`,
    ),
  ],
);
export const attempts = pgTable(
  'attempts',
  {
    id: id(),
    versionId: uuid('version_id')
      .notNull()
      .references(() => quizVersions.id),
    userId: uuid('user_id').references(() => user.id, { onDelete: 'cascade' }),
    roomId: uuid('room_id'),
    participantId: uuid('participant_id').unique(),
    guestSessionId: uuid('guest_session_id').references(() => soloGuests.id),
    status: attemptState('status').default('IN_PROGRESS').notNull(),
    revision: integer('revision').default(0).notNull(),
    submittedAt: time('submitted_at'),
    expiresAt: time('expires_at'),
    ...dates(),
  },
  (t) => [
    unique('attempt_version_unique').on(t.id, t.versionId),
    foreignKey({
      columns: [t.roomId, t.versionId],
      foreignColumns: [rooms.id, rooms.versionId],
    }).onDelete('cascade'),
    foreignKey({
      columns: [t.participantId, t.roomId],
      foreignColumns: [participants.id, participants.roomId],
    }).onDelete('cascade'),
    check(
      'attempt_owner',
      sql`(${t.roomId} IS NULL AND ${t.participantId} IS NULL AND num_nonnulls(${t.userId},${t.guestSessionId})=1) OR (${t.roomId} IS NOT NULL AND ${t.participantId} IS NOT NULL AND ${t.userId} IS NULL AND ${t.guestSessionId} IS NULL)`,
    ),
    check(
      'submitted_date',
      sql`(${t.status}='SUBMITTED')=(${t.submittedAt} IS NOT NULL)`,
    ),
    check('attempt_revision', sql`${t.revision}>=0`),
    check(
      'guest_attempt_retention',
      sql`(${t.participantId} IS NULL AND ${t.guestSessionId} IS NULL) OR (${t.expiresAt} IS NOT NULL AND ${t.expiresAt}<=${t.createdAt}+interval '7 days')`,
    ),
    index('user_history_idx').on(t.userId, t.createdAt),
    index('attempt_cleanup_idx').on(t.expiresAt),
  ],
);
export const answers = pgTable(
  'answers',
  {
    id: id(),
    attemptId: uuid('attempt_id').notNull(),
    questionId: uuid('question_id').notNull(),
    versionId: uuid('version_id').notNull(),
    textValue: varchar('text_value', { length: 4000 }),
    scaleValue: integer('scale_value'),
    ...dates(),
  },
  (t) => [
    unique('answer_attempt_question_unique').on(t.attemptId, t.questionId),
    unique('answer_question_unique').on(t.id, t.questionId),
    foreignKey({
      columns: [t.attemptId, t.versionId],
      foreignColumns: [attempts.id, attempts.versionId],
    }).onDelete('cascade'),
    foreignKey({
      columns: [t.questionId, t.versionId],
      foreignColumns: [questions.id, questions.versionId],
    }),
    check(
      'answer_one_scalar',
      sql`NOT (${t.textValue} IS NOT NULL AND ${t.scaleValue} IS NOT NULL)`,
    ),
  ],
);
export const answerOptions = pgTable(
  'answer_options',
  {
    answerId: uuid('answer_id').notNull(),
    questionId: uuid('question_id').notNull(),
    optionId: uuid('option_id').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.answerId, t.optionId] }),
    foreignKey({
      columns: [t.answerId, t.questionId],
      foreignColumns: [answers.id, answers.questionId],
    }).onDelete('cascade'),
    foreignKey({
      columns: [t.optionId, t.questionId],
      foreignColumns: [questionOptions.id, questionOptions.questionId],
    }),
  ],
);
export const resultSnapshots = pgTable(
  'result_snapshots',
  {
    id: id(),
    roomId: uuid('room_id')
      .unique()
      .references(() => rooms.id, { onDelete: 'cascade' }),
    attemptId: uuid('attempt_id')
      .unique()
      .references(() => attempts.id, { onDelete: 'cascade' }),
    algorithmVersion: varchar('algorithm_version', { length: 80 }).notNull(),
    payload: jsonb('payload').$type<AggregateResult>().notNull(),
    expiresAt: time('expires_at'),
    ...dates(),
  },
  (t) => [
    check('result_one_owner', sql`num_nonnulls(${t.roomId},${t.attemptId})=1`),
    index('result_cleanup_idx').on(t.expiresAt),
  ],
);
export const mediaAssets = pgTable(
  'media_assets',
  {
    id: id(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    storageKey: text('storage_key').notNull().unique(),
    mimeType: varchar('mime_type', { length: 80 }).notNull(),
    bytes: integer('bytes').notNull(),
    status: varchar('status', { length: 20 }).default('QUARANTINED').notNull(),
    expiresAt: time('expires_at'),
    ...dates(),
  },
  (t) => [
    check('media_bytes', sql`${t.bytes}>0`),
    check(
      'media_status',
      sql`${t.status} IN ('QUARANTINED','READY','REJECTED')`,
    ),
    index('media_owner_idx').on(t.ownerId),
    index('media_cleanup_idx').on(t.expiresAt),
  ],
);
export const moderationReviews = pgTable(
  'moderation_reviews',
  {
    id: id(),
    versionId: uuid('version_id')
      .notNull()
      .references(() => quizVersions.id),
    reviewerId: uuid('reviewer_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    status: reviewState('status').default('PENDING').notNull(),
    reason: varchar('reason', { length: 2000 }),
    ...dates(),
  },
  (t) => [
    uniqueIndex('one_pending_review_idx')
      .on(t.versionId)
      .where(sql`${t.status}='PENDING'`),
    index('moderation_queue_idx').on(t.status, t.createdAt),
  ],
);
export const contentReports = pgTable(
  'content_reports',
  {
    id: id(),
    versionId: uuid('version_id')
      .notNull()
      .references(() => quizVersions.id),
    reporterId: uuid('reporter_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    reason: varchar('reason', { length: 2000 }).notNull(),
    status: reviewState('status').default('PENDING').notNull(),
    ...dates(),
  },
  (t) => [index('report_queue_idx').on(t.status, t.createdAt)],
);
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: id(),
    actorId: uuid('actor_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    action: varchar('action', { length: 80 }).notNull(),
    resourceId: uuid('resource_id'),
    ...dates(),
  },
  (t) => [index('audit_actor_idx').on(t.actorId, t.createdAt)],
);
export const entitlements = pgTable(
  'entitlements',
  {
    id: id(),
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    feature: varchar('feature', { length: 80 }).notNull(),
    expiresAt: time('expires_at'),
    ...dates(),
  },
  (t) => [unique('entitlement_user_feature').on(t.userId, t.feature)],
);
export const productEvents = pgTable(
  'product_events',
  {
    id: id(),
    event: varchar('event', { length: 40 }).notNull(),
    day: time('day').notNull(),
    count: integer('count').notNull(),
    ...dates(),
  },
  (t) => [
    unique('aggregate_event_day').on(t.event, t.day),
    check(
      'event_allowlist',
      sql`${t.event} IN ('catalog_view','quiz_completed')`,
    ),
    check('event_count', sql`${t.count}>=0`),
  ],
);

export const soloGuests = pgTable(
  'solo_guests',
  {
    id: id(),
    verifier: varchar('verifier', { length: 64 }).notNull().unique(),
    adultConfirmed: boolean('adult_confirmed').default(false).notNull(),
    expiresAt: time('expires_at').notNull(),
    revokedAt: time('revoked_at'),
    ...dates(),
  },
  (t) => [
    index('solo_guest_expiry_idx').on(t.expiresAt),
    check(
      'solo_guest_retention',
      sql`${t.expiresAt}<=${t.createdAt}+interval '7 days' AND ${t.expiresAt}>${t.createdAt}`,
    ),
  ],
);
