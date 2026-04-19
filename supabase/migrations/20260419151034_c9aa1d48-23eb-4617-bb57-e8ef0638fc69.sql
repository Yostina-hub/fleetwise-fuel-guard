UPDATE public.form_versions
SET schema = '{
  "version": 1,
  "fields": [
    {"id":"fld_rsa_1","key":"title","type":"text","label":"Incident summary","required":true,"validation":{"maxLength":120},"placeholder":"e.g. Flat tire on the way to Adama"},
    {"id":"fld_rsa_2","key":"vehicle_id","type":"vehicle","label":"Vehicle","required":true},
    {"id":"fld_rsa_3","key":"driver_id","type":"driver","label":"Driver","helpText":"When a driver fills this in from the Driver Portal, this is auto-set to their record.","required":false},
    {"id":"fld_rsa_3a","key":"driver_name","type":"text","label":"Driver name","readOnly":true,"helpText":"Auto-filled from the selected driver.","autofillFrom":{"entity":"driver","sourceKey":"driver_id","sourceField":"full_name"}},
    {"id":"fld_rsa_3b","key":"driver_phone","type":"text","label":"Driver phone","readOnly":true,"autofillFrom":{"entity":"driver","sourceKey":"driver_id","sourceField":"phone"}},
    {"id":"fld_rsa_3c","key":"driver_license_number","type":"text","label":"License number","readOnly":true,"autofillFrom":{"entity":"driver","sourceKey":"driver_id","sourceField":"license_number"}},
    {"id":"fld_rsa_3d","key":"driver_license_class","type":"text","label":"License class","readOnly":true,"autofillFrom":{"entity":"driver","sourceKey":"driver_id","sourceField":"license_class"}},
    {"id":"fld_rsa_3e","key":"driver_license_expiry","type":"date","label":"License expiry","readOnly":true,"autofillFrom":{"entity":"driver","sourceKey":"driver_id","sourceField":"license_expiry"}},
    {"id":"fld_rsa_3f","key":"driver_employee_id","type":"text","label":"Employee ID","readOnly":true,"autofillFrom":{"entity":"driver","sourceKey":"driver_id","sourceField":"employee_id"}},
    {"id":"fld_rsa_3g","key":"driver_status","type":"text","label":"Driver status","readOnly":true,"autofillFrom":{"entity":"driver","sourceKey":"driver_id","sourceField":"status"}},
    {"id":"fld_rsa_3h","key":"driver_emergency_contact_name","type":"text","label":"Emergency contact name","readOnly":true,"autofillFrom":{"entity":"driver","sourceKey":"driver_id","sourceField":"emergency_contact_name"}},
    {"id":"fld_rsa_3i","key":"driver_emergency_contact_phone","type":"text","label":"Emergency contact phone","readOnly":true,"autofillFrom":{"entity":"driver","sourceKey":"driver_id","sourceField":"emergency_contact_phone"}},
    {"id":"fld_rsa_4","key":"breakdown_type","type":"select","label":"Breakdown type","options":[{"label":"Mechanical","value":"mechanical"},{"label":"Electrical","value":"electrical"},{"label":"Flat tire","value":"tire"},{"label":"Out of fuel","value":"fuel"},{"label":"Dead battery","value":"battery"},{"label":"Accident","value":"accident"},{"label":"Lockout","value":"lockout"},{"label":"Other","value":"other"}],"required":true,"defaultValue":"mechanical"},
    {"id":"fld_rsa_5","key":"priority","type":"select","label":"Priority","options":[{"label":"Low","value":"low"},{"label":"Medium","value":"medium"},{"label":"High","value":"high"},{"label":"Critical","value":"critical"}],"required":false,"defaultValue":"medium"},
    {"id":"fld_rsa_6","key":"location_name","type":"text","label":"Location","required":true,"placeholder":"e.g. KM 45 Bole road"},
    {"id":"fld_rsa_7","key":"lat","type":"number","label":"Latitude","helpText":"Optional — paste GPS coordinates if available.","required":false},
    {"id":"fld_rsa_8","key":"lng","type":"number","label":"Longitude","required":false},
    {"id":"fld_rsa_9","key":"tow_required","type":"checkbox","label":"Tow service required","required":false,"defaultValue":false},
    {"id":"fld_rsa_10","key":"service_provider","type":"text","label":"Service provider (if known)","required":false},
    {"id":"fld_rsa_11","key":"provider_phone","type":"text","label":"Provider phone","required":false},
    {"id":"fld_rsa_12","key":"estimated_cost","type":"number","label":"Estimated cost (ETB)","required":false},
    {"id":"fld_rsa_13","key":"description","type":"textarea","label":"Description","required":false,"validation":{"maxLength":1000},"placeholder":"Describe the issue and any immediate hazards…"},
    {"id":"fld_rsa_14","key":"documents","type":"file","label":"Photos / supporting documents","required":false}
  ]
}'::jsonb,
    updated_at = now()
WHERE form_id = 'de8391cc-d299-4b94-aaa1-bc68b02a5073';