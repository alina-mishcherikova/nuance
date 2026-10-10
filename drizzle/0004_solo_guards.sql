-- Preserve stage-1 room behavior while binding solo guest ownership and expiry.
CREATE OR REPLACE FUNCTION guard_attempt_version() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE parent_expiry timestamptz;
BEGIN
 IF TG_OP='INSERT' AND NOT EXISTS(SELECT 1 FROM quiz_versions WHERE id=NEW.version_id AND status='PUBLISHED') THEN RAISE EXCEPTION 'Attempt requires published version'; END IF;
 IF TG_OP='UPDATE' AND (NEW.version_id<>OLD.version_id OR NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.guest_session_id IS DISTINCT FROM OLD.guest_session_id OR NEW.participant_id IS DISTINCT FROM OLD.participant_id OR NEW.room_id IS DISTINCT FROM OLD.room_id) THEN RAISE EXCEPTION 'Attempt identity is fixed'; END IF;
 IF TG_OP='UPDATE' AND OLD.status='SUBMITTED' AND NEW IS DISTINCT FROM OLD THEN RAISE EXCEPTION 'Submitted attempt is frozen'; END IF;
 IF NEW.guest_session_id IS NOT NULL THEN
  SELECT expires_at INTO parent_expiry FROM solo_guests WHERE id=NEW.guest_session_id AND revoked_at IS NULL;
  IF parent_expiry IS NULL OR NEW.expires_at IS NULL OR NEW.expires_at>parent_expiry THEN RAISE EXCEPTION 'Guest data cannot outlive its parent'; END IF;
 END IF;
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE FUNCTION guard_solo_answer() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE aid uuid; phase attempt_state; expired timestamptz;
BEGIN
 IF TG_TABLE_NAME='answers' THEN aid=CASE WHEN TG_OP='DELETE' THEN OLD.attempt_id ELSE NEW.attempt_id END;
 ELSE SELECT attempt_id INTO aid FROM answers WHERE id=CASE WHEN TG_OP='DELETE' THEN OLD.answer_id ELSE NEW.answer_id END; END IF;
 SELECT status,expires_at INTO phase,expired FROM attempts WHERE id=aid FOR UPDATE;
 -- Physical cleanup may delete expired records. Live submitted answers are immutable.
 IF phase='SUBMITTED' AND (expired IS NULL OR expired>now()) THEN RAISE EXCEPTION 'Submitted answers are frozen'; END IF;
 IF TG_OP='UPDATE' THEN
  IF TG_TABLE_NAME='answers' AND (NEW.attempt_id<>OLD.attempt_id OR NEW.question_id<>OLD.question_id OR NEW.version_id<>OLD.version_id) THEN RAISE EXCEPTION 'Answer identity is fixed'; END IF;
  IF TG_TABLE_NAME='answer_options' AND NEW IS DISTINCT FROM OLD THEN RAISE EXCEPTION 'Option identity is fixed'; END IF;
 END IF;
 RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END $$;
CREATE TRIGGER answer_frozen_guard BEFORE INSERT OR UPDATE OR DELETE ON answers FOR EACH ROW EXECUTE FUNCTION guard_solo_answer();
CREATE TRIGGER answer_option_frozen_guard BEFORE INSERT OR UPDATE OR DELETE ON answer_options FOR EACH ROW EXECUTE FUNCTION guard_solo_answer();
