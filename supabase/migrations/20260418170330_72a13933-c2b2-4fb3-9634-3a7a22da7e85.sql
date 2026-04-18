UPDATE public.form_versions fv
SET schema = $JSON${
  "version": 1,
  "fields": [
    { "id": "sec_header", "key": "_sec_header", "type": "section", "label": "Header", "fields": [
      { "id": "f_asset", "key": "vehicle_id", "type": "vehicle", "label": "Asset Number", "required": true, "layout": {"colSpan": 1} },
      { "id": "f_wrtype", "key": "work_request_type", "type": "select", "label": "Work Request Type", "layout": {"colSpan": 1},
        "options": [{"label":"Maintenance","value":"maintenance"},{"label":"Inspection","value":"inspection"},{"label":"Fuel Request","value":"fuel_request"}] },
      { "id": "f_dept", "key": "assigned_department", "type": "text", "label": "Assigned Department", "required": true, "layout": {"colSpan": 1} },
      { "id": "f_prio", "key": "priority", "type": "select", "label": "Priority", "required": true, "layout": {"colSpan": 1},
        "options": [{"label":"1-Critical","value":"1"},{"label":"2-High","value":"2"},{"label":"3-Medium","value":"3"},{"label":"4-Low","value":"4"}] },
      { "id": "f_start", "key": "request_by_start_date", "type": "datetime", "label": "Request By Start Date", "required": true, "layout": {"colSpan": 1} },
      { "id": "f_compl", "key": "request_by_completion_date", "type": "datetime", "label": "Request By Completion Date", "required": true, "layout": {"colSpan": 1} },
      { "id": "f_reqfor", "key": "requested_for", "type": "user", "label": "Requested For", "layout": {"colSpan": 1} },
      { "id": "f_crit", "key": "asset_criticality", "type": "select", "label": "Asset Criticality", "layout": {"colSpan": 1},
        "options": [{"label":"Critical","value":"critical"},{"label":"High","value":"high"},{"label":"Medium","value":"medium"},{"label":"Low","value":"low"}] }
    ]},
    { "id": "sec_desc", "key": "_sec_desc", "type": "section", "label": "Request Description", "fields": [
      { "id": "f_addl", "key": "additional_description", "type": "textarea", "label": "Additional Description", "required": true, "layout": {"colSpan": 2} }
    ]},
    { "id": "sec_att", "key": "_sec_att", "type": "section", "label": "Request Attachments", "fields": [
      { "id": "f_att", "key": "attachments", "type": "file", "label": "Attachments", "layout": {"colSpan": 2} }
    ]},
    { "id": "sec_create", "key": "_sec_create", "type": "section", "label": "Creation Information", "fields": [
      { "id": "f_cby", "key": "created_by", "type": "user", "label": "Created By", "layout": {"colSpan": 1} },
      { "id": "f_notify", "key": "notify_user", "type": "select", "label": "Notify User", "layout": {"colSpan": 1},
        "options": [{"label":"No","value":"no"},{"label":"Yes","value":"yes"}], "defaultValue": "no" },
      { "id": "f_phone", "key": "phone_number", "type": "phone", "label": "Phone Number", "layout": {"colSpan": 1} },
      { "id": "f_email", "key": "email", "type": "email", "label": "E-mail", "layout": {"colSpan": 1} },
      { "id": "f_contpref", "key": "contact_preference", "type": "select", "label": "Contact Preference", "layout": {"colSpan": 1},
        "options": [{"label":"Phone","value":"phone"},{"label":"E-mail","value":"email"},{"label":"SMS","value":"sms"}] }
    ]},
    { "id": "sec_descinf", "key": "_sec_descinf", "type": "section", "label": "Descriptive Information", "fields": [
      { "id": "f_ctx", "key": "context_value", "type": "select", "label": "Context Value", "required": true, "layout": {"colSpan": 1},
        "options": [{"label":"Vehicle Maintenance request","value":"vehicle_maintenance"},{"label":"Generator Maintenance request","value":"generator_maintenance"},{"label":"Facility Maintenance request","value":"facility_maintenance"}],
        "defaultValue": "vehicle_maintenance" },
      { "id": "f_rdept", "key": "requestor_department", "type": "text", "label": "Requestor Department", "required": true, "layout": {"colSpan": 1} },
      { "id": "f_mtype", "key": "maintenance_request_type", "type": "select", "label": "Type of maintenance request", "required": true, "layout": {"colSpan": 1},
        "options": [{"label":"Preventive Maintenance","value":"preventive"},{"label":"Breakdown / Corrective","value":"breakdown"},{"label":"Inspection","value":"inspection"},{"label":"Tire Service","value":"tire"},{"label":"Body & Paint","value":"body_paint"},{"label":"Electrical","value":"electrical"}] },
      { "id": "f_km", "key": "current_odometer", "type": "number", "label": "KM reading", "required": true, "layout": {"colSpan": 1} },
      { "id": "f_dtype", "key": "driver_type", "type": "select", "label": "Driver type", "required": true, "layout": {"colSpan": 1},
        "options": [{"label":"Employee Driver","value":"employee"},{"label":"Outsourced Driver","value":"outsourced"},{"label":"Vehicle Driver","value":"vehicle_driver"}] },
      { "id": "f_drv", "key": "driver_id", "type": "driver", "label": "Driver Name", "layout": {"colSpan": 1} },
      { "id": "f_dphone", "key": "driver_phone", "type": "phone", "label": "Driver Phone No.", "required": true, "layout": {"colSpan": 1} },
      { "id": "f_fuel", "key": "fuel_level_in_tank", "type": "select", "label": "fuel level in the tank", "required": true, "layout": {"colSpan": 1},
        "options": [{"label":"Empty","value":"empty"},{"label":"1/4","value":"1/4"},{"label":"1/2","value":"1/2"},{"label":"3/4","value":"3/4"},{"label":"Full","value":"full"}] },
      { "id": "f_remark", "key": "remark", "type": "textarea", "label": "Remark", "layout": {"colSpan": 2} }
    ]}
  ]
}$JSON$::jsonb,
    updated_at = now()
FROM public.forms f
WHERE fv.form_id = f.id
  AND fv.status = 'draft'
  AND (f.key = 'create_work_request' OR f.key LIKE 'create_work_request_copy%');