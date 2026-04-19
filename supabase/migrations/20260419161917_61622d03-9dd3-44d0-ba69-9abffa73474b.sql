DO $$
DECLARE
  v_form_id uuid;
  v_schema jsonb := $json$
{
  "version": 1,
  "fields": [
    {"id":"s1","key":"employment_type_section","type":"section","label":"Employment Type","required":false,"fields":[
      {"id":"f1","key":"driver_type","type":"select","label":"Driver Type","required":true,"defaultValue":"ethio_contract","layout":{"colSpan":1},"options":[
        {"value":"ethio_contract","label":"Ethio telecom — Contract"},
        {"value":"ethio_permanent","label":"Ethio telecom — Permanent"},
        {"value":"ethio_outsource","label":"Ethio telecom — Outsource"},
        {"value":"ethio_rental","label":"Ethio telecom — Rental"},
        {"value":"3pl","label":"3PL"},
        {"value":"individual","label":"Individual"}
      ]}
    ]},
    {"id":"s2","key":"personal_info_section","type":"section","label":"Personal Information","required":false,"fields":[
      {"id":"f2","key":"first_name","type":"text","label":"First Name","required":true,"placeholder":"e.g. Abebe","layout":{"colSpan":1}},
      {"id":"f3","key":"middle_name","type":"text","label":"Middle Name","required":true,"placeholder":"e.g. Kebede","layout":{"colSpan":1}},
      {"id":"f4","key":"last_name","type":"text","label":"Last Name","required":true,"placeholder":"e.g. Tadesse","layout":{"colSpan":1}},
      {"id":"f5","key":"gender","type":"select","label":"Gender","required":false,"layout":{"colSpan":1},"options":[
        {"value":"male","label":"Male"},{"value":"female","label":"Female"}]},
      {"id":"f6","key":"phone","type":"text","label":"Phone Number","required":true,"placeholder":"09XXXXXXXX","layout":{"colSpan":1},"validation":{"pattern":"^09[0-9]{8}$","patternMessage":"Ethiopian phone: 09XXXXXXXX","maxLength":10}},
      {"id":"f7","key":"email","type":"email","label":"Email","required":false,"placeholder":"driver@example.com","layout":{"colSpan":1}},
      {"id":"f8","key":"date_of_birth","type":"date","label":"Date of Birth","required":false,"layout":{"colSpan":1}},
      {"id":"f9","key":"employee_id","type":"text","label":"Employee ID","required":false,"placeholder":"EMP-001","layout":{"colSpan":1}}
    ]},
    {"id":"s3","key":"address_section","type":"section","label":"Address","required":false,"fields":[
      {"id":"f10","key":"address_region","type":"text","label":"Region","required":true,"layout":{"colSpan":1}},
      {"id":"f11","key":"address_zone","type":"text","label":"Zone","required":true,"layout":{"colSpan":1}},
      {"id":"f12","key":"address_woreda","type":"text","label":"Woreda","required":true,"layout":{"colSpan":1}},
      {"id":"f13","key":"address_specific","type":"text","label":"Specific Address","required":false,"placeholder":"Building name, street, directions...","validation":{"maxLength":500}}
    ]},
    {"id":"s4","key":"legal_section","type":"section","label":"Legal & Verification","required":false,"fields":[
      {"id":"f14","key":"govt_id_type","type":"select","label":"ID Type","required":true,"layout":{"colSpan":1},"options":[
        {"value":"passport","label":"Passport"},
        {"value":"drivers_license","label":"Driver''s License"},
        {"value":"kebele_id","label":"Kebele ID"}
      ]},
      {"id":"f15","key":"license_number","type":"text","label":"ID / License Number","required":true,"placeholder":"Enter ID / license number...","layout":{"colSpan":1}},
      {"id":"f16","key":"national_id","type":"text","label":"National ID (FAN)","required":false,"placeholder":"Please enter FAN","layout":{"colSpan":1}},
      {"id":"f17","key":"license_type","type":"select","label":"License Type / Class","required":false,"layout":{"colSpan":1},"options":[
        {"value":"automobile","label":"Automobile"},
        {"value":"dry_1","label":"Cargo -1"},
        {"value":"dry_2","label":"Cargo -2"},
        {"value":"dry_3","label":"Cargo -3"},
        {"value":"motor_cycle","label":"Motor Cycle"},
        {"value":"n_a","label":"N/A"},
        {"value":"public_1","label":"Public - 1"},
        {"value":"public_2","label":"Public - 2"},
        {"value":"public_3","label":"Public - 3"},
        {"value":"taxi_1","label":"Taxi -1"},
        {"value":"taxi_2","label":"Taxi -2"}
      ]},
      {"id":"f18","key":"license_issue_date","type":"date","label":"License Issue Date","required":false,"layout":{"colSpan":1}},
      {"id":"f19","key":"license_expiry","type":"date","label":"License Expiry Date","required":false,"layout":{"colSpan":1}}
    ]},
    {"id":"s5","key":"attachments_section","type":"section","label":"Driver Attachments","required":false,"fields":[
      {"id":"f20","key":"license_front_url","type":"file","label":"Driver''s License (Front)","required":false,"layout":{"colSpan":1}},
      {"id":"f21","key":"license_back_url","type":"file","label":"Driver''s License (Back)","required":false,"layout":{"colSpan":1}},
      {"id":"f22","key":"national_id_url","type":"file","label":"National ID Card","required":false,"layout":{"colSpan":1}},
      {"id":"f23","key":"avatar_url","type":"file","label":"Profile Photo","required":false,"layout":{"colSpan":1}}
    ]},
    {"id":"s6","key":"employment_details_section","type":"section","label":"Employment Details","required":false,"fields":[
      {"id":"f24","key":"employment_type","type":"select","label":"Employment Status","required":false,"defaultValue":"regular","layout":{"colSpan":1},"options":[
        {"value":"regular","label":"Regular"},{"value":"shift","label":"Shift"},
        {"value":"full_time","label":"Full Time"},{"value":"part_time","label":"Part Time"},
        {"value":"contract","label":"Contract"},{"value":"freelance","label":"Freelance"}]},
      {"id":"f25","key":"status","type":"select","label":"Driver Status","required":false,"defaultValue":"active","layout":{"colSpan":1},"options":[
        {"value":"active","label":"Active"},{"value":"suspended","label":"Suspended"},
        {"value":"on_leave","label":"On Leave"},{"value":"terminated","label":"Terminated"}]},
      {"id":"f26","key":"joining_date","type":"date","label":"Effective Date","required":false,"layout":{"colSpan":1}},
      {"id":"f27","key":"department","type":"select","label":"Assigned Location","required":true,"layout":{"colSpan":1},"options":[
        {"value":"corp_fom1","label":"FOM I"},{"value":"corp_fom2","label":"FOM II"},
        {"value":"corp_zemengebeya","label":"ZemenGEBEYA Logistics"},
        {"value":"region_bole","label":"Bole"},{"value":"region_yeka","label":"Yeka"},
        {"value":"region_kirkos","label":"Kirkos"},{"value":"region_arada","label":"Arada"},
        {"value":"region_addis_ketema","label":"Addis Ketema"},{"value":"region_lideta","label":"Lideta"},
        {"value":"region_gulele","label":"Gulele"},{"value":"region_kolfe","label":"Kolfe Keranio"},
        {"value":"region_akaky","label":"Akaky Kaliti"},{"value":"region_nefas_silk","label":"Nefas Silk Lafto"},
        {"value":"region_lemi_kura","label":"Lemi Kura"},{"value":"region_adama","label":"Adama"},
        {"value":"region_hawassa","label":"Hawassa"},{"value":"region_bahir_dar","label":"Bahir Dar"},
        {"value":"region_mekelle","label":"Mekelle"},{"value":"region_jimma","label":"Jimma"},
        {"value":"region_dire_dawa","label":"Dire Dawa"}]},
      {"id":"f28","key":"experience_years","type":"number","label":"Years of Experience","required":false,"placeholder":"e.g. 3","layout":{"colSpan":1},"validation":{"min":0}},
      {"id":"f29","key":"route_type","type":"select","label":"Type of Routes","required":false,"defaultValue":"intracity","layout":{"colSpan":1},"options":[
        {"value":"intracity","label":"Intracity"},{"value":"intercity","label":"Intercity"},
        {"value":"both","label":"Both"}]},
      {"id":"f30","key":"medical_certificate_expiry","type":"date","label":"Medical Certificate Expiry","required":false,"layout":{"colSpan":1}}
    ]},
    {"id":"s7","key":"banking_section","type":"section","label":"Banking Information","required":false,"fields":[
      {"id":"f31","key":"bank_name","type":"text","label":"Bank Name","required":false,"layout":{"colSpan":1}},
      {"id":"f32","key":"bank_account","type":"text","label":"Bank Account Number","required":false,"layout":{"colSpan":1}}
    ]},
    {"id":"s8","key":"emergency_section","type":"section","label":"Emergency Contact","required":false,"fields":[
      {"id":"f33","key":"emergency_contact_name","type":"text","label":"Contact Name","required":true,"placeholder":"Family member name","layout":{"colSpan":1}},
      {"id":"f34","key":"emergency_contact_phone","type":"text","label":"Contact Phone","required":true,"placeholder":"09XXXXXXXX","layout":{"colSpan":1}},
      {"id":"f35","key":"blood_type","type":"select","label":"Blood Type","required":false,"layout":{"colSpan":1},"options":[
        {"value":"A+","label":"A+"},{"value":"A-","label":"A-"},
        {"value":"B+","label":"B+"},{"value":"B-","label":"B-"},
        {"value":"AB+","label":"AB+"},{"value":"AB-","label":"AB-"},
        {"value":"O+","label":"O+"},{"value":"O-","label":"O-"}]}
    ]},
    {"id":"s9","key":"identification_section","type":"section","label":"Identification Tags (Optional)","required":false,"fields":[
      {"id":"f36","key":"rfid_tag","type":"text","label":"RFID Tag","required":false,"placeholder":"RFID tag number","layout":{"colSpan":1}},
      {"id":"f37","key":"ibutton_id","type":"text","label":"iButton ID","required":false,"placeholder":"iButton ID","layout":{"colSpan":1}},
      {"id":"f38","key":"bluetooth_id","type":"text","label":"Bluetooth ID","required":false,"placeholder":"Bluetooth device ID","layout":{"colSpan":1}}
    ]},
    {"id":"s10","key":"credentials_section","type":"section","label":"Account Credentials","required":false,"fields":[
      {"id":"f39","key":"password","type":"text","label":"Password","required":true,"placeholder":"Min 12 chars, upper/lower/digit/special","helpText":"Used to provision the driver portal login when an email is also supplied.","layout":{"colSpan":1},"validation":{"minLength":12,"maxLength":100}}
    ]},
    {"id":"s11","key":"notes_section","type":"section","label":"Additional Notes","required":false,"fields":[
      {"id":"f40","key":"notes","type":"textarea","label":"Notes","required":false,"placeholder":"Additional information..."}
    ]}
  ]
}
$json$::jsonb;
  v_settings jsonb := '{"submitLabel":"Register Driver","cancelLabel":"Cancel","successMessage":"Driver registered. Portal access is provisioned automatically when an email + password are supplied.","twoColumnLayout":true}'::jsonb;
BEGIN
  FOR v_form_id IN SELECT id FROM public.forms WHERE key = 'driver_registration' LOOP
    UPDATE public.form_versions fv
       SET schema = v_schema,
           settings = v_settings,
           updated_at = now()
     WHERE fv.form_id = v_form_id
       AND fv.id = (
         SELECT id FROM public.form_versions
          WHERE form_id = v_form_id
          ORDER BY version_number DESC
          LIMIT 1
       );
  END LOOP;
END$$;