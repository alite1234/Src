CREATE OR REPLACE FUNCTION enforce_event_logo_limit()
RETURNS trigger AS $$
BEGIN
  IF (SELECT count(*) FROM event_logos WHERE event_id = NEW.event_id) >= 5 THEN
    RAISE EXCEPTION 'An event can have at most five logos'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS event_logo_limit ON event_logos;

CREATE TRIGGER event_logo_limit
BEFORE INSERT ON event_logos
FOR EACH ROW
EXECUTE FUNCTION enforce_event_logo_limit();
