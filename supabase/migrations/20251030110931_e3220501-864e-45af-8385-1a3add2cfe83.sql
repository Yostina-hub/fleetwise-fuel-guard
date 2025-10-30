-- Create vehicle_telemetry table to track GPS device connectivity and real-time data
CREATE TABLE IF NOT EXISTS public.vehicle_telemetry (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL,
  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7),
  speed_kmh DECIMAL(5, 2),
  heading DECIMAL(5, 2),
  fuel_level_percent DECIMAL(5, 2),
  engine_on BOOLEAN DEFAULT false,
  device_connected BOOLEAN DEFAULT true,
  last_communication_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.vehicle_telemetry ENABLE ROW LEVEL SECURITY;

-- Create policies for vehicle_telemetry
CREATE POLICY "Users can view telemetry for their organization vehicles" 
ON public.vehicle_telemetry 
FOR SELECT 
USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert telemetry for their organization vehicles" 
ON public.vehicle_telemetry 
FOR INSERT 
WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update telemetry for their organization vehicles" 
ON public.vehicle_telemetry 
FOR UPDATE 
USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- Create indexes for better performance
CREATE INDEX idx_vehicle_telemetry_vehicle_id ON public.vehicle_telemetry(vehicle_id);
CREATE INDEX idx_vehicle_telemetry_organization_id ON public.vehicle_telemetry(organization_id);
CREATE INDEX idx_vehicle_telemetry_last_communication ON public.vehicle_telemetry(last_communication_at DESC);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_vehicle_telemetry_updated_at
BEFORE UPDATE ON public.vehicle_telemetry
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create a function to check if a vehicle is online (communicated in last 5 minutes)
CREATE OR REPLACE FUNCTION public.is_vehicle_online(vehicle_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.vehicle_telemetry 
    WHERE vehicle_id = vehicle_uuid 
    AND device_connected = true
    AND last_communication_at > (now() - INTERVAL '5 minutes')
    ORDER BY last_communication_at DESC
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;