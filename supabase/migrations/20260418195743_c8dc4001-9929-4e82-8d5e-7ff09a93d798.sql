ALTER TABLE public.drivers DISABLE TRIGGER rate_limit_inserts;

INSERT INTO public.drivers (
  organization_id, user_id, first_name, middle_name, last_name, email, phone,
  license_number, license_class, license_type, license_issue_date, license_expiry, license_verified,
  national_id, govt_id_type, national_id_verified, verification_status,
  employee_id, employment_type, driver_type, department, route_type, hire_date, joining_date, experience_years,
  status, gender, date_of_birth, blood_type,
  address_region, address_zone, address_woreda, address_specific,
  emergency_contact_name, emergency_contact_phone, emergency_contact_relationship,
  bank_name, bank_account, safety_score, total_trips, total_distance_km, notes
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'ad4facd8-73f9-4472-bff0-2283d0766b89',
  'Henok', 'Y.', 'Yizengaw', 'henyize@gmail.com', '+251911223344',
  'ET-DL-2024-778899', 'B', 'Public II', '2022-03-15', '2027-03-15', true,
  'ETID-1990-554433', 'national_id', true, 'verified',
  'EMP-DRV-0042', 'permanent', 'company', 'Operations', 'urban', '2023-01-10', '2023-01-10', 5,
  'active', 'male', '1990-06-22', 'O+',
  'Addis Ababa', 'Bole', 'Woreda 03', 'Bole Medhanialem, near Friendship Mall',
  'Selamawit Yizengaw', '+251922334455', 'spouse',
  'Commercial Bank of Ethiopia', '1000234567890', 95, 0, 0, 'Full driver profile provisioned for portal access.'
);

ALTER TABLE public.drivers ENABLE TRIGGER rate_limit_inserts;