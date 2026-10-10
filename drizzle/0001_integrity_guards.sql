-- Reviewed custom migration. Protect published payloads at the database boundary.
CREATE FUNCTION guard_published_version() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD.status = 'PUBLISHED' THEN RAISE EXCEPTION 'Published versions are immutable'; END IF;
 RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END $$;
CREATE TRIGGER published_version_guard BEFORE UPDATE OR DELETE ON quiz_versions FOR EACH ROW EXECUTE FUNCTION guard_published_version();
--> statement-breakpoint
CREATE FUNCTION guard_version_content() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE old_version uuid; new_version uuid; row_data jsonb;
BEGIN
 FOR row_data IN SELECT value FROM jsonb_array_elements(CASE WHEN TG_OP='INSERT' THEN jsonb_build_array(to_jsonb(NEW)) WHEN TG_OP='DELETE' THEN jsonb_build_array(to_jsonb(OLD)) ELSE jsonb_build_array(to_jsonb(OLD),to_jsonb(NEW)) END) LOOP
  IF TG_TABLE_NAME IN ('questions','quiz_copy','quiz_tags') THEN new_version=(row_data->>'version_id')::uuid;
  ELSIF TG_TABLE_NAME IN ('question_options','question_copy') THEN SELECT version_id INTO new_version FROM questions WHERE id=(row_data->>'question_id')::uuid;
  ELSE SELECT q.version_id INTO new_version FROM question_options o JOIN questions q ON q.id=o.question_id WHERE o.id=(row_data->>'option_id')::uuid;
  END IF;
  -- Lock against concurrent publication as well as edits.
  SELECT id INTO old_version FROM quiz_versions WHERE id=new_version AND status='PUBLISHED' FOR UPDATE;
  IF old_version IS NOT NULL THEN RAISE EXCEPTION 'Published content is immutable'; END IF;
  PERFORM id FROM quiz_versions WHERE id=new_version FOR UPDATE;
  IF EXISTS (SELECT 1 FROM quiz_versions WHERE id=new_version AND status='PUBLISHED') THEN RAISE EXCEPTION 'Published content is immutable'; END IF;
 END LOOP;
 RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END $$;
CREATE TRIGGER question_immutable BEFORE INSERT OR UPDATE OR DELETE ON questions FOR EACH ROW EXECUTE FUNCTION guard_version_content();
CREATE TRIGGER option_immutable BEFORE INSERT OR UPDATE OR DELETE ON question_options FOR EACH ROW EXECUTE FUNCTION guard_version_content();
CREATE TRIGGER quiz_copy_immutable BEFORE INSERT OR UPDATE OR DELETE ON quiz_copy FOR EACH ROW EXECUTE FUNCTION guard_version_content();
CREATE TRIGGER question_copy_immutable BEFORE INSERT OR UPDATE OR DELETE ON question_copy FOR EACH ROW EXECUTE FUNCTION guard_version_content();
CREATE TRIGGER option_copy_immutable BEFORE INSERT OR UPDATE OR DELETE ON option_copy FOR EACH ROW EXECUTE FUNCTION guard_version_content();
CREATE TRIGGER quiz_tag_immutable BEFORE INSERT OR UPDATE OR DELETE ON quiz_tags FOR EACH ROW EXECUTE FUNCTION guard_version_content();
--> statement-breakpoint
ALTER TABLE rooms ADD CONSTRAINT room_host_member FOREIGN KEY (host_participant_id,id) REFERENCES participants(id,room_id) DEFERRABLE INITIALLY DEFERRED;
CREATE FUNCTION guard_room_membership() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE room_record rooms; target uuid;
BEGIN
 target=CASE WHEN TG_OP='DELETE' THEN OLD.room_id ELSE NEW.room_id END;
 IF TG_OP='UPDATE' AND NEW.room_id<>OLD.room_id THEN RAISE EXCEPTION 'Cannot move participants'; END IF;
 SELECT * INTO room_record FROM rooms WHERE id=target FOR UPDATE;
 IF NOT FOUND THEN RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END; END IF;
 IF TG_OP='INSERT' THEN
  IF room_record.status<>'LOBBY' OR room_record.expires_at<=now() THEN RAISE EXCEPTION 'Membership is closed'; END IF;
  IF NEW.expires_at>room_record.expires_at THEN RAISE EXCEPTION 'Credential outlives room'; END IF;
  IF (SELECT count(*) FROM participants WHERE room_id=target)>=room_record.capacity THEN RAISE EXCEPTION 'Room is full'; END IF;
 ELSIF TG_OP='DELETE' AND room_record.status NOT IN ('LOBBY','EXPIRED','CANCELLED') AND room_record.expires_at>now() THEN RAISE EXCEPTION 'Membership is frozen';
 ELSIF TG_OP='UPDATE' AND (NEW.nickname<>OLD.nickname OR NEW.user_id IS DISTINCT FROM OLD.user_id) AND room_record.status<>'LOBBY' AND room_record.expires_at>now() THEN RAISE EXCEPTION 'Membership is frozen';
 END IF;
 RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END $$;
CREATE TRIGGER room_membership_guard BEFORE INSERT OR UPDATE OR DELETE ON participants FOR EACH ROW EXECUTE FUNCTION guard_room_membership();
--> statement-breakpoint
CREATE FUNCTION guard_room_lifecycle() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE member_count integer;
BEGIN
 IF TG_OP='INSERT' THEN
  IF NEW.status<>'LOBBY' OR NOT EXISTS(SELECT 1 FROM quiz_versions WHERE id=NEW.version_id AND status='PUBLISHED') THEN RAISE EXCEPTION 'Room requires published version and lobby'; END IF;
 ELSE
  IF NEW.version_id<>OLD.version_id OR NEW.capacity<>OLD.capacity OR NEW.code<>OLD.code THEN RAISE EXCEPTION 'Room configuration is fixed'; END IF;
  IF NEW.status<>OLD.status AND NOT ((OLD.status='LOBBY' AND NEW.status IN ('IN_PROGRESS','CANCELLED','EXPIRED')) OR (OLD.status='IN_PROGRESS' AND NEW.status IN ('COMPLETED','CANCELLED','EXPIRED'))) THEN RAISE EXCEPTION 'Invalid room transition'; END IF;
  IF OLD.status='LOBBY' AND NEW.status='IN_PROGRESS' THEN
   SELECT count(*) INTO member_count FROM participants WHERE room_id=NEW.id AND revoked_at IS NULL AND expires_at>now();
   IF member_count NOT BETWEEN 2 AND NEW.capacity OR NEW.started_at IS NULL THEN RAISE EXCEPTION 'Invalid start'; END IF;
  END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER room_lifecycle_guard BEFORE INSERT OR UPDATE ON rooms FOR EACH ROW EXECUTE FUNCTION guard_room_lifecycle();
--> statement-breakpoint
CREATE FUNCTION guard_attempt_version() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='INSERT' AND NOT EXISTS(SELECT 1 FROM quiz_versions WHERE id=NEW.version_id AND status='PUBLISHED') THEN RAISE EXCEPTION 'Attempt requires published version'; END IF;
 IF TG_OP='UPDATE' AND (NEW.version_id<>OLD.version_id OR NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.participant_id IS DISTINCT FROM OLD.participant_id OR NEW.room_id IS DISTINCT FROM OLD.room_id) THEN RAISE EXCEPTION 'Attempt identity is fixed'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER attempt_version_guard BEFORE INSERT OR UPDATE ON attempts FOR EACH ROW EXECUTE FUNCTION guard_attempt_version();
