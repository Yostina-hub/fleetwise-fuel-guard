-- Enable realtime for devices and vehicle_telemetry tables
ALTER TABLE devices REPLICA IDENTITY FULL;
ALTER TABLE vehicle_telemetry REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE devices;
ALTER PUBLICATION supabase_realtime ADD TABLE vehicle_telemetry;