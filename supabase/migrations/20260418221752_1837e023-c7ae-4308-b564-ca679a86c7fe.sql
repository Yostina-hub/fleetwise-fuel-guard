-- =====================================================================
-- Seed centralized "vehicle_handover" form for every organization
-- (mirrors EFM/FA/03 paper form — 30-row accessory grid via repeater)
-- =====================================================================

DO $mig$
DECLARE
  v_org RECORD;
  v_form_id UUID;
  v_version_id UUID;
  v_creator UUID;
  v_schema JSONB := $JSON${
    "version": 1,
    "fields": [
      { "id": "sec_meta", "key": "_sec_meta", "type": "section", "label": "Workflow context",
        "fields": [
          { "id": "f_title", "key": "title", "type": "text", "label": "Handover title", "required": true,
            "placeholder": "Handover — ETB-3-12345 to driver Abebe", "layout": {"colSpan": 2} },
          { "id": "f_vehicle", "key": "vehicle_id", "type": "vehicle", "label": "Vehicle", "required": true, "layout": {"colSpan": 2} }
        ]
      },
      { "id": "sec_header", "key": "_sec_header", "type": "section", "label": "Header (EFM/FA/03)",
        "fields": [
          { "id": "f_3rd", "key": "third_party_inspection_expiry", "type": "date",
            "label": "3rd-party inspection expiry date", "layout": {"colSpan": 1},
            "helpText": "Auto-filled from insurance record." },
          { "id": "f_ann", "key": "annual_inspection_expiry", "type": "date",
            "label": "Annual inspection expiry date", "layout": {"colSpan": 1},
            "helpText": "Auto-filled from registration record." },
          { "id": "f_ref", "key": "ref_no", "type": "text", "label": "Ref No.",
            "placeholder": "EFM/FA/03-#####", "layout": {"colSpan": 1} },
          { "id": "f_date", "key": "form_date", "type": "date", "label": "Date",
            "required": true, "layout": {"colSpan": 1} }
        ]
      },
      { "id": "sec_identity", "key": "_sec_identity", "type": "section", "label": "Vehicle identity",
        "fields": [
          { "id": "f_vt", "key": "vehicle_type", "type": "text",
            "label": "1. Type of vehicle", "layout": {"colSpan": 1} },
          { "id": "f_vm", "key": "vehicle_model", "type": "text",
            "label": "2. Model", "layout": {"colSpan": 1} },
          { "id": "f_ch", "key": "chassis_no", "type": "text",
            "label": "3. Chassis No.", "layout": {"colSpan": 1} },
          { "id": "f_en", "key": "engine_no", "type": "text",
            "label": "4. Engine No.", "layout": {"colSpan": 1} },
          { "id": "f_pl", "key": "plate_no", "type": "text",
            "label": "5. Plate No.", "layout": {"colSpan": 1} },
          { "id": "f_cap", "key": "passenger_load_capacity", "type": "text",
            "label": "6. Passenger / Load capacity", "layout": {"colSpan": 1} },
          { "id": "f_km", "key": "km_reading", "type": "number",
            "label": "7. KM reading", "required": true, "layout": {"colSpan": 1},
            "helpText": "Update to actual reading at handover." },
          { "id": "f_fa", "key": "fuel_amount", "type": "number",
            "label": "8. Fuel amount (L)", "layout": {"colSpan": 1} }
        ]
      },
      { "id": "sec_acc", "key": "_sec_acc", "type": "section",
        "label": "Fleet Safety, Comfort, Accessories and Comfort Material Lists (30 items)",
        "fields": [
          { "id": "f_lines", "key": "checklist_lines", "type": "repeater",
            "label": "Accessory checklist", "minRows": 30, "maxRows": 30,
            "helpText": "30 numbered slots — material name and quantity for each accessory handed over.",
            "layout": {"colSpan": 2},
            "fields": [
              { "id": "rl_name", "key": "name", "type": "text", "label": "List of material", "layout": {"colSpan": 1} },
              { "id": "rl_qty",  "key": "qty",  "type": "number", "label": "QTY", "layout": {"colSpan": 1} }
            ]
          }
        ]
      },
      { "id": "sec_cond", "key": "_sec_cond", "type": "section", "label": "Overall condition",
        "fields": [
          { "id": "f_cond", "key": "overall_vehicle_condition", "type": "textarea",
            "label": "Current Over all Vehicle Condition", "layout": {"colSpan": 2},
            "helpText": "Body, interior, mechanical, tires, lights, glass, etc." }
        ]
      },
      { "id": "sec_signoff", "key": "_sec_signoff", "type": "section", "label": "Three-party identity",
        "fields": [
          { "id": "f_dn", "key": "delivered_by_name", "type": "text",
            "label": "Delivered by — Name", "required": true, "layout": {"colSpan": 1} },
          { "id": "f_di", "key": "delivered_by_id",   "type": "text",
            "label": "Delivered by — ID No.", "layout": {"colSpan": 1} },
          { "id": "f_rd", "key": "received_by_driver_id", "type": "driver",
            "label": "Received by — Driver", "required": true, "layout": {"colSpan": 2},
            "helpText": "Selecting a driver here updates the vehicle's assigned driver when the handover is archived." },
          { "id": "f_rn", "key": "received_by_name", "type": "text",
            "label": "Received by — Name", "required": true, "layout": {"colSpan": 1} },
          { "id": "f_ri", "key": "received_by_id",   "type": "text",
            "label": "Received by — ID No.", "layout": {"colSpan": 1} },
          { "id": "f_wn", "key": "witness_name", "type": "text",
            "label": "Witness — Name", "layout": {"colSpan": 1} },
          { "id": "f_wi", "key": "witness_id",   "type": "text",
            "label": "Witness — ID No.", "layout": {"colSpan": 1} }
        ]
      },
      { "id": "sec_notes", "key": "_sec_notes", "type": "section", "label": "Notes",
        "fields": [
          { "id": "f_desc", "key": "description", "type": "textarea",
            "label": "Notes / context (internal)", "layout": {"colSpan": 2} }
        ]
      }
    ]
  }$JSON$::jsonb;
  v_settings JSONB := jsonb_build_object(
    'submitLabel', 'File handover',
    'cancelLabel', 'Cancel',
    'successMessage', 'Vehicle Handover form submitted.',
    'twoColumnLayout', true
  );
BEGIN
  FOR v_org IN SELECT id FROM public.organizations LOOP
    -- Skip if already seeded (active row exists)
    IF EXISTS (
      SELECT 1 FROM public.forms
      WHERE organization_id = v_org.id
        AND key = 'vehicle_handover'
        AND is_archived = false
    ) THEN
      CONTINUE;
    END IF;

    -- Pick a creator: first super_admin/fleet_manager in org, else any profile in org
    SELECT user_id INTO v_creator
    FROM public.user_roles
    WHERE organization_id = v_org.id
      AND role IN ('super_admin','fleet_manager','operations_manager')
    ORDER BY (role = 'super_admin') DESC, (role = 'fleet_manager') DESC
    LIMIT 1;

    IF v_creator IS NULL THEN
      SELECT user_id INTO v_creator
      FROM public.profiles
      WHERE organization_id = v_org.id
      LIMIT 1;
    END IF;

    IF v_creator IS NULL THEN
      CONTINUE; -- org has no users; nothing to attribute the seed to
    END IF;

    INSERT INTO public.forms (organization_id, key, name, description, category, created_by)
    VALUES (
      v_org.id, 'vehicle_handover',
      'Vehicle Handover (EFM/FA/03)',
      'Centralized Vehicle Submission Form — captures identity, 30-line accessory checklist, condition narrative and three-party sign-off identity.',
      'fleet', v_creator
    )
    RETURNING id INTO v_form_id;

    INSERT INTO public.form_versions (form_id, organization_id, version_number, status, schema, settings,
                                      published_at, published_by, created_by)
    VALUES (v_form_id, v_org.id, 1, 'published', v_schema, v_settings, now(), v_creator, v_creator)
    RETURNING id INTO v_version_id;

    UPDATE public.forms SET current_published_version_id = v_version_id WHERE id = v_form_id;
  END LOOP;
END
$mig$;