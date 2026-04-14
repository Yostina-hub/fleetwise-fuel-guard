ALTER TABLE devices DISABLE TRIGGER rate_limit_inserts;
ALTER TABLE devices DISABLE TRIGGER validate_device_insert;

INSERT INTO devices (imei, tracker_model, status, organization_id, vehicle_id)
VALUES ('90291015', 'Traccar Client (OsmAnd)', 'active', '00000000-0000-0000-0000-000000000001', '02c0cbe5-5135-4bbf-a4ad-5a78fbf926ae');

ALTER TABLE devices ENABLE TRIGGER rate_limit_inserts;
ALTER TABLE devices ENABLE TRIGGER validate_device_insert;