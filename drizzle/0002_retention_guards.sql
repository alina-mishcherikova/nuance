-- Retention is enforced on dependent guest rows even before service features exist.
CREATE FUNCTION guard_guest_expiry() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE parent_expiry timestamptz;
BEGIN
 IF TG_TABLE_NAME='participants' THEN
  SELECT expires_at INTO parent_expiry FROM rooms WHERE id=NEW.room_id;
 ELSIF TG_TABLE_NAME='attempts' AND NEW.room_id IS NOT NULL THEN
  SELECT LEAST(r.expires_at,p.expires_at) INTO parent_expiry FROM rooms r JOIN participants p ON p.room_id=r.id WHERE r.id=NEW.room_id AND p.id=NEW.participant_id;
 ELSIF TG_TABLE_NAME='result_snapshots' THEN
  IF NEW.room_id IS NOT NULL THEN SELECT expires_at INTO parent_expiry FROM rooms WHERE id=NEW.room_id;
  ELSE SELECT expires_at INTO parent_expiry FROM attempts WHERE id=NEW.attempt_id;
  END IF;
 END IF;
 IF parent_expiry IS NOT NULL AND (NEW.expires_at IS NULL OR NEW.expires_at>parent_expiry) THEN RAISE EXCEPTION 'Guest data cannot outlive its parent'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER participant_expiry_guard BEFORE INSERT OR UPDATE ON participants FOR EACH ROW EXECUTE FUNCTION guard_guest_expiry();
CREATE TRIGGER attempt_expiry_guard BEFORE INSERT OR UPDATE ON attempts FOR EACH ROW EXECUTE FUNCTION guard_guest_expiry();
CREATE TRIGGER result_expiry_guard BEFORE INSERT OR UPDATE ON result_snapshots FOR EACH ROW EXECUTE FUNCTION guard_guest_expiry();
