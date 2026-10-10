ALTER TYPE "public"."question_kind" ADD VALUE 'YES_NO_MAYBE';--> statement-breakpoint
ALTER TYPE "public"."question_kind" ADD VALUE 'SINGLE_CHOICE';--> statement-breakpoint
ALTER TYPE "public"."question_kind" ADD VALUE 'MULTIPLE_CHOICE';--> statement-breakpoint
CREATE TABLE "solo_guests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"verifier" varchar(64) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "solo_guests_verifier_unique" UNIQUE("verifier"),
	CONSTRAINT "solo_guest_retention" CHECK ("solo_guests"."expires_at"<="solo_guests"."created_at"+interval '7 days' AND "solo_guests"."expires_at">"solo_guests"."created_at")
);
--> statement-breakpoint
ALTER TABLE "attempts" DROP CONSTRAINT "attempt_owner";--> statement-breakpoint
ALTER TABLE "attempts" DROP CONSTRAINT "guest_attempt_retention";--> statement-breakpoint
ALTER TABLE "attempts" ADD COLUMN "guest_session_id" uuid;--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "stable_id" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "category" varchar(60) DEFAULT 'connection' NOT NULL;--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "weight" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "min_selections" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "max_selections" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "image_id" uuid;--> statement-breakpoint
ALTER TABLE "quiz_versions" ADD COLUMN "revision" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "quiz_versions" ADD COLUMN "approved" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "quiz_versions" ADD COLUMN "official" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "quiz_versions" ADD COLUMN "featured" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "quiz_versions" ADD COLUMN "archived" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "quiz_versions" ADD COLUMN "cover_id" uuid;--> statement-breakpoint
CREATE INDEX "solo_guest_expiry_idx" ON "solo_guests" USING btree ("expires_at");--> statement-breakpoint
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_guest_session_id_solo_guests_id_fk" FOREIGN KEY ("guest_session_id") REFERENCES "public"."solo_guests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_image_id_media_assets_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media_assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_versions" ADD CONSTRAINT "quiz_versions_cover_id_media_assets_id_fk" FOREIGN KEY ("cover_id") REFERENCES "public"."media_assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "question_stable_version_unique" UNIQUE("version_id","stable_id");--> statement-breakpoint
ALTER TABLE "attempts" ADD CONSTRAINT "attempt_owner" CHECK (("attempts"."room_id" IS NULL AND "attempts"."participant_id" IS NULL AND num_nonnulls("attempts"."user_id","attempts"."guest_session_id")=1) OR ("attempts"."room_id" IS NOT NULL AND "attempts"."participant_id" IS NOT NULL AND "attempts"."user_id" IS NULL AND "attempts"."guest_session_id" IS NULL));--> statement-breakpoint
ALTER TABLE "attempts" ADD CONSTRAINT "guest_attempt_retention" CHECK (("attempts"."participant_id" IS NULL AND "attempts"."guest_session_id" IS NULL) OR ("attempts"."expires_at" IS NOT NULL AND "attempts"."expires_at"<="attempts"."created_at"+interval '7 days'));--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "question_weight" CHECK ("questions"."weight" BETWEEN 0 AND 10);--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "question_selections" CHECK ("questions"."min_selections">=1 AND "questions"."max_selections">="questions"."min_selections" AND "questions"."max_selections"<=12);