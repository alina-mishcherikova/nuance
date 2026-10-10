-- Approval is never available to authors. Protect complete snapshots even for future operator transports.
CREATE FUNCTION validate_approved_publication() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE q record; copies integer; opts integer;
BEGIN
 IF NEW.status<>'PUBLISHED' OR NOT NEW.approved THEN RETURN NEW; END IF;
 IF NOT EXISTS(SELECT 1 FROM moderation_reviews WHERE version_id=NEW.id AND status='APPROVED') THEN RAISE EXCEPTION 'Publication requires moderation approval'; END IF;
 SELECT count(*) INTO copies FROM quiz_copy WHERE version_id=NEW.id AND length(trim(title))>0 AND length(trim(description))>0;
 IF copies<>3 OR (SELECT count(*) FROM questions WHERE version_id=NEW.id) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Incomplete publication'; END IF;
 IF EXISTS(SELECT 1 FROM categories WHERE id=NEW.category_id AND adult_only) AND NOT NEW.adult_only THEN RAISE EXCEPTION 'Adult publication must be gated'; END IF;
 FOR q IN SELECT * FROM questions WHERE version_id=NEW.id LOOP
  IF q.kind::text NOT IN ('YES_NO_MAYBE','SINGLE_CHOICE','MULTIPLE_CHOICE','SCALE') THEN RAISE EXCEPTION 'Unsupported question'; END IF;
  IF (SELECT count(*) FROM question_copy WHERE question_id=q.id AND length(trim(prompt))>0)<>3 THEN RAISE EXCEPTION 'Incomplete question translation'; END IF;
  IF NOT EXISTS(SELECT 1 FROM categories WHERE slug=q.category) OR (NOT NEW.adult_only AND EXISTS(SELECT 1 FROM categories WHERE slug=q.category AND adult_only)) THEN RAISE EXCEPTION 'Invalid question category'; END IF;
  SELECT count(*) INTO opts FROM question_options WHERE question_id=q.id;
  IF (q.kind::text='SCALE' AND (q.scale_min<>1 OR q.scale_max<>5 OR opts<>0)) OR (q.kind::text='YES_NO_MAYBE' AND (opts<>3 OR (SELECT count(*) FROM question_options WHERE question_id=q.id AND value IN ('yes','no','maybe'))<>3)) OR (q.kind::text IN ('SINGLE_CHOICE','MULTIPLE_CHOICE') AND opts NOT BETWEEN 2 AND 12) OR (q.kind::text='MULTIPLE_CHOICE' AND q.max_selections>opts) THEN RAISE EXCEPTION 'Invalid question configuration'; END IF;
  IF EXISTS(SELECT 1 FROM question_options o WHERE o.question_id=q.id AND (SELECT count(*) FROM option_copy c WHERE c.option_id=o.id AND length(trim(c.label))>0)<>3) THEN RAISE EXCEPTION 'Incomplete option translation'; END IF;
 END LOOP;
 RETURN NEW;
END $$;
CREATE TRIGGER publication_validation BEFORE INSERT OR UPDATE ON quiz_versions FOR EACH ROW EXECUTE FUNCTION validate_approved_publication();
