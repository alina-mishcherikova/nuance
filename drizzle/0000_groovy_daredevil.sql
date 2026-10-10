CREATE TYPE "public"."attempt_state" AS ENUM('IN_PROGRESS', 'SUBMITTED');--> statement-breakpoint
CREATE TYPE "public"."locale" AS ENUM('en', 'uk', 'fr');--> statement-breakpoint
CREATE TYPE "public"."question_kind" AS ENUM('SINGLE', 'MULTIPLE', 'SCALE', 'TEXT');--> statement-breakpoint
CREATE TYPE "public"."review_state" AS ENUM('PENDING', 'APPROVED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('user', 'moderator', 'admin');--> statement-breakpoint
CREATE TYPE "public"."room_state" AS ENUM('LOBBY', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."version_state" AS ENUM('DRAFT', 'PENDING', 'PUBLISHED', 'REJECTED');--> statement-breakpoint
CREATE TABLE "auth_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"password" text,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "account_provider_unique" UNIQUE("provider_id","account_id")
);
--> statement-breakpoint
CREATE TABLE "answer_options" (
	"answer_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"option_id" uuid NOT NULL,
	CONSTRAINT "answer_options_answer_id_option_id_pk" PRIMARY KEY("answer_id","option_id")
);
--> statement-breakpoint
CREATE TABLE "answers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attempt_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"version_id" uuid NOT NULL,
	"text_value" varchar(4000),
	"scale_value" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "answer_attempt_question_unique" UNIQUE("attempt_id","question_id"),
	CONSTRAINT "answer_question_unique" UNIQUE("id","question_id"),
	CONSTRAINT "answer_one_scalar" CHECK (NOT ("answers"."text_value" IS NOT NULL AND "answers"."scale_value" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version_id" uuid NOT NULL,
	"user_id" uuid,
	"room_id" uuid,
	"participant_id" uuid,
	"status" "attempt_state" DEFAULT 'IN_PROGRESS' NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL,
	"submitted_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "attempts_participant_id_unique" UNIQUE("participant_id"),
	CONSTRAINT "attempt_version_unique" UNIQUE("id","version_id"),
	CONSTRAINT "attempt_owner" CHECK (("attempts"."room_id" IS NULL AND "attempts"."participant_id" IS NULL AND "attempts"."user_id" IS NOT NULL) OR ("attempts"."room_id" IS NOT NULL AND "attempts"."participant_id" IS NOT NULL AND "attempts"."user_id" IS NULL)),
	CONSTRAINT "submitted_date" CHECK (("attempts"."status"='SUBMITTED')=("attempts"."submitted_at" IS NOT NULL)),
	CONSTRAINT "attempt_revision" CHECK ("attempts"."revision">=0),
	CONSTRAINT "guest_attempt_retention" CHECK ("attempts"."participant_id" IS NULL OR ("attempts"."expires_at" IS NOT NULL AND "attempts"."expires_at"<="attempts"."created_at"+interval '7 days'))
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"action" varchar(80) NOT NULL,
	"resource_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(60) NOT NULL,
	"adult_only" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "category_copy" (
	"category_id" uuid NOT NULL,
	"locale" "locale" NOT NULL,
	"name" varchar(120) NOT NULL,
	CONSTRAINT "category_copy_category_id_locale_pk" PRIMARY KEY("category_id","locale")
);
--> statement-breakpoint
CREATE TABLE "content_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version_id" uuid NOT NULL,
	"reporter_id" uuid,
	"reason" varchar(2000) NOT NULL,
	"status" "review_state" DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entitlements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"feature" varchar(80) NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "entitlement_user_feature" UNIQUE("user_id","feature")
);
--> statement-breakpoint
CREATE TABLE "media_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"storage_key" text NOT NULL,
	"mime_type" varchar(80) NOT NULL,
	"bytes" integer NOT NULL,
	"status" varchar(20) DEFAULT 'QUARANTINED' NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "media_assets_storage_key_unique" UNIQUE("storage_key"),
	CONSTRAINT "media_bytes" CHECK ("media_assets"."bytes">0),
	CONSTRAINT "media_status" CHECK ("media_assets"."status" IN ('QUARANTINED','READY','REJECTED'))
);
--> statement-breakpoint
CREATE TABLE "moderation_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version_id" uuid NOT NULL,
	"reviewer_id" uuid,
	"status" "review_state" DEFAULT 'PENDING' NOT NULL,
	"reason" varchar(2000),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "option_copy" (
	"option_id" uuid NOT NULL,
	"locale" "locale" NOT NULL,
	"label" varchar(500) NOT NULL,
	CONSTRAINT "option_copy_option_id_locale_pk" PRIMARY KEY("option_id","locale")
);
--> statement-breakpoint
CREATE TABLE "participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" uuid NOT NULL,
	"user_id" uuid,
	"nickname" varchar(40) NOT NULL,
	"credential_hash" varchar(64) NOT NULL,
	"revoked_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "participants_credential_hash_unique" UNIQUE("credential_hash"),
	CONSTRAINT "participant_room_unique" UNIQUE("id","room_id"),
	CONSTRAINT "credential_hash_format" CHECK ("participants"."credential_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "participant_retention" CHECK ("participants"."expires_at"<="participants"."created_at"+interval '7 days' AND "participants"."expires_at">"participants"."created_at")
);
--> statement-breakpoint
CREATE TABLE "product_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event" varchar(40) NOT NULL,
	"day" timestamp with time zone NOT NULL,
	"count" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "aggregate_event_day" UNIQUE("event","day"),
	CONSTRAINT "event_allowlist" CHECK ("product_events"."event" IN ('catalog_view','quiz_completed')),
	CONSTRAINT "event_count" CHECK ("product_events"."count">=0)
);
--> statement-breakpoint
CREATE TABLE "question_copy" (
	"question_id" uuid NOT NULL,
	"locale" "locale" NOT NULL,
	"prompt" varchar(2000) NOT NULL,
	"help" varchar(1000),
	CONSTRAINT "question_copy_question_id_locale_pk" PRIMARY KEY("question_id","locale")
);
--> statement-breakpoint
CREATE TABLE "question_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"value" varchar(100) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "option_order_unique" UNIQUE("question_id","position"),
	CONSTRAINT "option_value_unique" UNIQUE("question_id","value"),
	CONSTRAINT "option_question_unique" UNIQUE("id","question_id"),
	CONSTRAINT "option_position" CHECK ("question_options"."position">=0)
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"kind" "question_kind" NOT NULL,
	"required" boolean DEFAULT true NOT NULL,
	"scale_min" integer,
	"scale_max" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "question_order_unique" UNIQUE("version_id","position"),
	CONSTRAINT "question_version_unique" UNIQUE("id","version_id"),
	CONSTRAINT "question_position" CHECK ("questions"."position">=0),
	CONSTRAINT "question_scale" CHECK (("questions"."kind"='SCALE' AND "questions"."scale_min" IS NOT NULL AND "questions"."scale_max" IS NOT NULL AND "questions"."scale_min"<"questions"."scale_max") OR ("questions"."kind"<>'SCALE' AND "questions"."scale_min" IS NULL AND "questions"."scale_max" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "quiz_copy" (
	"version_id" uuid NOT NULL,
	"locale" "locale" NOT NULL,
	"title" varchar(160) NOT NULL,
	"description" varchar(2000) NOT NULL,
	CONSTRAINT "quiz_copy_version_id_locale_pk" PRIMARY KEY("version_id","locale")
);
--> statement-breakpoint
CREATE TABLE "quiz_tags" (
	"version_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "quiz_tags_version_id_tag_id_pk" PRIMARY KEY("version_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "quiz_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quiz_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"status" "version_state" DEFAULT 'DRAFT' NOT NULL,
	"category_id" uuid NOT NULL,
	"adult_only" boolean DEFAULT false NOT NULL,
	"scoring_config" jsonb NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quiz_version_unique" UNIQUE("quiz_id","version"),
	CONSTRAINT "positive_version" CHECK ("quiz_versions"."version">0),
	CONSTRAINT "published_date" CHECK (("quiz_versions"."status"='PUBLISHED')=("quiz_versions"."published_at" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "quizzes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"slug" varchar(100) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quizzes_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "auth_rate_limits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"count" integer NOT NULL,
	"last_request" bigint NOT NULL,
	CONSTRAINT "auth_rate_limits_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "result_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" uuid,
	"attempt_id" uuid,
	"algorithm_version" varchar(80) NOT NULL,
	"payload" jsonb NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "result_snapshots_room_id_unique" UNIQUE("room_id"),
	CONSTRAINT "result_snapshots_attempt_id_unique" UNIQUE("attempt_id"),
	CONSTRAINT "result_one_owner" CHECK (num_nonnulls("result_snapshots"."room_id","result_snapshots"."attempt_id")=1)
);
--> statement-breakpoint
CREATE TABLE "rooms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(8) NOT NULL,
	"version_id" uuid NOT NULL,
	"host_user_id" uuid,
	"host_participant_id" uuid,
	"status" "room_state" DEFAULT 'LOBBY' NOT NULL,
	"capacity" integer DEFAULT 10 NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "room_version_unique" UNIQUE("id","version_id"),
	CONSTRAINT "room_code_format" CHECK ("rooms"."code" ~ '^[A-Z2-9]{8}$'),
	CONSTRAINT "room_capacity" CHECK ("rooms"."capacity" BETWEEN 2 AND 10),
	CONSTRAINT "room_retention" CHECK ("rooms"."expires_at" <= "rooms"."created_at" + interval '7 days' AND "rooms"."expires_at">"rooms"."created_at")
);
--> statement-breakpoint
CREATE TABLE "auth_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "auth_sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "tag_copy" (
	"tag_id" uuid NOT NULL,
	"locale" "locale" NOT NULL,
	"name" varchar(120) NOT NULL,
	CONSTRAINT "tag_copy_tag_id_locale_pk" PRIMARY KEY("tag_id","locale")
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(60) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tags_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(80) NOT NULL,
	"email" varchar(254) NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" "role" DEFAULT 'user' NOT NULL,
	"locale" "locale" DEFAULT 'en' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "normalized_email" CHECK ("users"."email"=lower("users"."email"))
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "auth_accounts" ADD CONSTRAINT "auth_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "answer_options" ADD CONSTRAINT "answer_options_answer_id_question_id_answers_id_question_id_fk" FOREIGN KEY ("answer_id","question_id") REFERENCES "public"."answers"("id","question_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "answer_options" ADD CONSTRAINT "answer_options_option_id_question_id_question_options_id_question_id_fk" FOREIGN KEY ("option_id","question_id") REFERENCES "public"."question_options"("id","question_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "answers" ADD CONSTRAINT "answers_attempt_id_version_id_attempts_id_version_id_fk" FOREIGN KEY ("attempt_id","version_id") REFERENCES "public"."attempts"("id","version_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "answers" ADD CONSTRAINT "answers_question_id_version_id_questions_id_version_id_fk" FOREIGN KEY ("question_id","version_id") REFERENCES "public"."questions"("id","version_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_version_id_quiz_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."quiz_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_room_id_version_id_rooms_id_version_id_fk" FOREIGN KEY ("room_id","version_id") REFERENCES "public"."rooms"("id","version_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_participant_id_room_id_participants_id_room_id_fk" FOREIGN KEY ("participant_id","room_id") REFERENCES "public"."participants"("id","room_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category_copy" ADD CONSTRAINT "category_copy_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_version_id_quiz_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."quiz_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_reviews" ADD CONSTRAINT "moderation_reviews_version_id_quiz_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."quiz_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_reviews" ADD CONSTRAINT "moderation_reviews_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "option_copy" ADD CONSTRAINT "option_copy_option_id_question_options_id_fk" FOREIGN KEY ("option_id") REFERENCES "public"."question_options"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participants" ADD CONSTRAINT "participants_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participants" ADD CONSTRAINT "participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_copy" ADD CONSTRAINT "question_copy_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_options" ADD CONSTRAINT "question_options_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_version_id_quiz_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."quiz_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_copy" ADD CONSTRAINT "quiz_copy_version_id_quiz_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."quiz_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_tags" ADD CONSTRAINT "quiz_tags_version_id_quiz_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."quiz_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_tags" ADD CONSTRAINT "quiz_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_versions" ADD CONSTRAINT "quiz_versions_quiz_id_quizzes_id_fk" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_versions" ADD CONSTRAINT "quiz_versions_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "result_snapshots" ADD CONSTRAINT "result_snapshots_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "result_snapshots" ADD CONSTRAINT "result_snapshots_attempt_id_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."attempts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_version_id_quiz_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."quiz_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_host_user_id_users_id_fk" FOREIGN KEY ("host_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tag_copy" ADD CONSTRAINT "tag_copy_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_idx" ON "auth_accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_history_idx" ON "attempts" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "attempt_cleanup_idx" ON "attempts" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "audit_actor_idx" ON "audit_logs" USING btree ("actor_id","created_at");--> statement-breakpoint
CREATE INDEX "report_queue_idx" ON "content_reports" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "media_owner_idx" ON "media_assets" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "media_cleanup_idx" ON "media_assets" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "one_pending_review_idx" ON "moderation_reviews" USING btree ("version_id") WHERE "moderation_reviews"."status"='PENDING';--> statement-breakpoint
CREATE INDEX "moderation_queue_idx" ON "moderation_reviews" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "room_registered_participant_idx" ON "participants" USING btree ("room_id","user_id") WHERE "participants"."user_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "participant_expiry_idx" ON "participants" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "quiz_tag_filter_idx" ON "quiz_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "catalog_idx" ON "quiz_versions" USING btree ("status","category_id","published_at");--> statement-breakpoint
CREATE INDEX "quiz_owner_idx" ON "quizzes" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "result_cleanup_idx" ON "result_snapshots" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "active_room_code_idx" ON "rooms" USING btree ("code") WHERE "rooms"."status" IN ('LOBBY','IN_PROGRESS');--> statement-breakpoint
CREATE INDEX "room_expiry_idx" ON "rooms" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "room_host_idx" ON "rooms" USING btree ("host_user_id","status");--> statement-breakpoint
CREATE INDEX "session_user_idx" ON "auth_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_expiry_idx" ON "auth_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "verification_identifier_idx" ON "verification_tokens" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "verification_expiry_idx" ON "verification_tokens" USING btree ("expires_at");