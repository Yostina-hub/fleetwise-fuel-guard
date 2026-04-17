-- Re-seed Fleet Inspection (Builder) with full FMG-INS 01 SOP:
-- 16 steps, branching on inspection type (Internal/Annual) and Pass/Fail outcomes,
-- with proper form fields, action buttons, and routing labels (sourceHandle).

DO $$
DECLARE
  v_org uuid;
  v_nodes jsonb;
  v_edges jsonb;
BEGIN
  -- Build nodes: each human_task has fields[] and actions[]; action ids are the routing keys
  v_nodes := $J$[
    {"id":"start","type":"custom","position":{"x":40,"y":40},
     "data":{"label":"Start — File Inspection Request","category":"triggers","nodeType":"trigger_event",
             "config":{}}},

    {"id":"list_vehicles","type":"custom","position":{"x":260,"y":40},
     "data":{"label":"1. List vehicles to be inspected","category":"actions","nodeType":"human_task",
             "config":{"title":"1. List vehicles to be inspected",
                       "description":"List all vehicles requiring inspection this cycle.",
                       "assignee_role":"operations_manager",
                       "fields":[
                         {"key":"vehicle_count","label":"Number of vehicles","type":"number","required":true},
                         {"key":"vehicle_list","label":"Vehicle plates / IDs (one per line)","type":"textarea","required":true},
                         {"key":"notes","label":"Notes","type":"textarea"}
                       ],
                       "actions":[{"id":"submitted","label":"Submit list","variant":"default"}]}}},

    {"id":"make_ready","type":"custom","position":{"x":520,"y":40},
     "data":{"label":"2. Make vehicles ready for inspection","category":"actions","nodeType":"human_task",
             "config":{"title":"2. Make vehicles ready for inspection",
                       "description":"Confirm vehicles are washed, fueled, and accessible.",
                       "assignee_role":"operations_manager",
                       "fields":[
                         {"key":"ready_date","label":"Ready date","type":"date","required":true},
                         {"key":"location","label":"Holding location","type":"text"},
                         {"key":"remarks","label":"Remarks","type":"textarea"}
                       ],
                       "actions":[{"id":"ready","label":"Vehicles ready","variant":"default"}]}}},

    {"id":"inspection_type","type":"custom","position":{"x":780,"y":40},
     "data":{"label":"What type of inspection?","category":"actions","nodeType":"human_task",
             "config":{"title":"Choose inspection type",
                       "description":"Select Internal Inspection or Annual (Authority) Inspection.",
                       "assignee_role":"fleet_manager",
                       "fields":[
                         {"key":"reason","label":"Reason / context","type":"textarea"}
                       ],
                       "actions":[
                         {"id":"internal","label":"Internal Inspection","variant":"default"},
                         {"id":"annual","label":"Annual Inspection","variant":"secondary"}
                       ]}}},

    {"id":"request_maint","type":"custom","position":{"x":780,"y":200},
     "data":{"label":"3. Request maintenance to perform fleet inspection","category":"actions","nodeType":"human_task",
             "config":{"title":"3. Request maintenance to perform inspection",
                       "description":"Request maintenance team to schedule the internal inspection.",
                       "assignee_role":"operations_manager",
                       "fields":[
                         {"key":"requested_date","label":"Requested date","type":"date","required":true},
                         {"key":"priority","label":"Priority","type":"select","required":true,
                          "options":[{"value":"low","label":"Low"},{"value":"normal","label":"Normal"},{"value":"high","label":"High"}]},
                         {"key":"instructions","label":"Instructions","type":"textarea"}
                       ],
                       "actions":[{"id":"requested","label":"Send to maintenance","variant":"default"}]}}},

    {"id":"assign_inspector","type":"custom","position":{"x":780,"y":360},
     "data":{"label":"4. Assign fleet inspector","category":"actions","nodeType":"human_task",
             "config":{"title":"4. Assign fleet inspector to perform inspection",
                       "assignee_role":"mechanic",
                       "fields":[
                         {"key":"inspector_name","label":"Inspector name","type":"text","required":true},
                         {"key":"scheduled_at","label":"Scheduled date/time","type":"datetime","required":true},
                         {"key":"checklist_ref","label":"Checklist reference","type":"text"}
                       ],
                       "actions":[{"id":"assigned","label":"Inspector assigned","variant":"default"}]}}},

    {"id":"pass_internal","type":"custom","position":{"x":780,"y":520},
     "data":{"label":"Pass inspection? (internal)","category":"actions","nodeType":"approval",
             "config":{"title":"Pass internal inspection?",
                       "description":"Did the vehicle pass the internal inspection?",
                       "assignee_role":"mechanic",
                       "fields":[
                         {"key":"defects_found","label":"Defects found","type":"textarea"},
                         {"key":"odometer","label":"Odometer (km)","type":"number"}
                       ],
                       "actions":[
                         {"id":"yes","label":"Pass","variant":"default"},
                         {"id":"no","label":"Fail","variant":"destructive"}
                       ]}}},

    {"id":"ready_for_trip","type":"custom","position":{"x":520,"y":520},
     "data":{"label":"5. Make sure vehicles are ready for trip","category":"actions","nodeType":"human_task",
             "config":{"title":"5. Confirm vehicles are ready for trip",
                       "assignee_role":"operations_manager",
                       "fields":[
                         {"key":"released_at","label":"Released at","type":"datetime","required":true},
                         {"key":"released_to","label":"Released to (driver/pool)","type":"text"}
                       ],
                       "actions":[{"id":"done","label":"Released","variant":"default"}]}}},

    {"id":"manage_breakdown","type":"custom","position":{"x":1040,"y":520},
     "data":{"label":"Manage preventive / break-down maintenance","category":"actions","nodeType":"human_task",
             "config":{"title":"Manage preventive or break-down maintenance",
                       "description":"Open a maintenance request and re-loop after repair.",
                       "assignee_role":"mechanic",
                       "fields":[
                         {"key":"work_order_no","label":"Work order #","type":"text","required":true},
                         {"key":"estimated_completion","label":"Estimated completion","type":"date"},
                         {"key":"notes","label":"Notes","type":"textarea"}
                       ],
                       "actions":[{"id":"reinspect","label":"Send for re-inspection","variant":"default"}]}}},

    {"id":"develop_schedule","type":"custom","position":{"x":1040,"y":40},
     "data":{"label":"6. Develop inspection schedule (Annual)","category":"actions","nodeType":"human_task",
             "config":{"title":"6. Develop the inspection schedule and assign facilitator",
                       "assignee_role":"fleet_manager",
                       "fields":[
                         {"key":"schedule_date","label":"Schedule date","type":"date","required":true},
                         {"key":"facilitator","label":"Facilitator name","type":"text","required":true},
                         {"key":"inspection_center","label":"Inspection center","type":"text"}
                       ],
                       "actions":[{"id":"scheduled","label":"Schedule confirmed","variant":"default"}]}}},

    {"id":"send_to_center","type":"custom","position":{"x":1300,"y":40},
     "data":{"label":"7. Send vehicle to inspection center","category":"actions","nodeType":"human_task",
             "config":{"title":"7. Send the vehicle to inspection center",
                       "assignee_role":"dispatcher",
                       "fields":[
                         {"key":"driver_name","label":"Driver name","type":"text","required":true},
                         {"key":"departure_at","label":"Departure time","type":"datetime","required":true}
                       ],
                       "actions":[{"id":"sent","label":"Vehicle dispatched","variant":"default"}]}}},

    {"id":"perform_inspection","type":"custom","position":{"x":1300,"y":200},
     "data":{"label":"8. Perform fleet inspection","category":"actions","nodeType":"human_task",
             "config":{"title":"8. Perform fleet inspection (at center)",
                       "assignee_role":"mechanic",
                       "fields":[
                         {"key":"inspector_name","label":"Center inspector","type":"text"},
                         {"key":"findings","label":"Findings","type":"textarea"}
                       ],
                       "actions":[{"id":"completed","label":"Inspection completed","variant":"default"}]}}},

    {"id":"pass_annual","type":"custom","position":{"x":1300,"y":360},
     "data":{"label":"Pass inspection? (annual)","category":"actions","nodeType":"approval",
             "config":{"title":"Pass annual inspection?",
                       "assignee_role":"fleet_manager",
                       "actions":[
                         {"id":"yes","label":"Pass","variant":"default"},
                         {"id":"no","label":"Fail","variant":"destructive"}
                       ]}}},

    {"id":"send_back","type":"custom","position":{"x":1560,"y":520},
     "data":{"label":"9. Send back vehicles for further maintenance","category":"actions","nodeType":"human_task",
             "config":{"title":"9. Send back the vehicle for further maintenance",
                       "assignee_role":"mechanic",
                       "fields":[
                         {"key":"defect_summary","label":"Defect summary","type":"textarea","required":true},
                         {"key":"return_date","label":"Expected return","type":"date"}
                       ],
                       "actions":[{"id":"sent_back","label":"Returned to maintenance","variant":"default"}]}}},

    {"id":"give_certificate","type":"custom","position":{"x":1300,"y":520},
     "data":{"label":"10. Give inspection certificate","category":"actions","nodeType":"human_task",
             "config":{"title":"10. Give inspection certificate",
                       "assignee_role":"fleet_manager",
                       "fields":[
                         {"key":"certificate_no","label":"Certificate #","type":"text","required":true},
                         {"key":"issued_at","label":"Issued at","type":"datetime","required":true}
                       ],
                       "actions":[{"id":"issued","label":"Certificate issued","variant":"default"}]}}},

    {"id":"raise_payment","type":"custom","position":{"x":1300,"y":680},
     "data":{"label":"11. Raise payment request","category":"actions","nodeType":"human_task",
             "config":{"title":"11. Raise payment request per contract",
                       "assignee_role":"finance",
                       "fields":[
                         {"key":"amount_etb","label":"Amount (ETB)","type":"number","required":true},
                         {"key":"contract_ref","label":"Contract reference","type":"text"},
                         {"key":"justification","label":"Justification","type":"textarea"}
                       ],
                       "actions":[{"id":"raised","label":"Payment requested","variant":"default"}]}}},

    {"id":"request_advance","type":"custom","position":{"x":1560,"y":40},
     "data":{"label":"12. Request advance to inspection center / Transport Authority","category":"actions","nodeType":"human_task",
             "config":{"title":"12. Request advance for center & Transport Authority Bolo",
                       "assignee_role":"finance",
                       "fields":[
                         {"key":"advance_amount","label":"Advance amount (ETB)","type":"number","required":true},
                         {"key":"requested_for","label":"Requested for","type":"select",
                          "options":[{"value":"center","label":"Inspection center"},{"value":"authority","label":"Transport Authority"},{"value":"both","label":"Both"}]}
                       ],
                       "actions":[{"id":"requested","label":"Submit advance request","variant":"default"}]}}},

    {"id":"finance_confirm","type":"custom","position":{"x":1820,"y":40},
     "data":{"label":"13. Finance confirms & orders payment","category":"actions","nodeType":"approval",
             "config":{"title":"13. Confirm advance and order for payment",
                       "assignee_role":"finance",
                       "fields":[
                         {"key":"approved_amount","label":"Approved amount (ETB)","type":"number","required":true},
                         {"key":"approval_ref","label":"Approval reference","type":"text"}
                       ],
                       "actions":[
                         {"id":"approve","label":"Approve","variant":"default"},
                         {"id":"reject","label":"Reject","variant":"destructive"}
                       ]}}},

    {"id":"receive_advance","type":"custom","position":{"x":1820,"y":200},
     "data":{"label":"14. Receive advance, pay & collect Bolo","category":"actions","nodeType":"human_task",
             "config":{"title":"14. Receive advance, pay center & authority, collect Bolo",
                       "assignee_role":"operations_manager",
                       "fields":[
                         {"key":"paid_at","label":"Paid at","type":"datetime","required":true},
                         {"key":"bolo_number","label":"Bolo number","type":"text","required":true}
                       ],
                       "actions":[{"id":"paid","label":"Paid & Bolo collected","variant":"default"}]}}},

    {"id":"authority_receive","type":"custom","position":{"x":1820,"y":360},
     "data":{"label":"15. Transport Authority issues Bolo","category":"actions","nodeType":"human_task",
             "config":{"title":"15. Transport Authority receives payment and issues Bolo",
                       "assignee_role":"admin",
                       "fields":[
                         {"key":"bolo_url","label":"Bolo certificate URL / ref","type":"text"},
                         {"key":"valid_until","label":"Valid until","type":"date","required":true}
                       ],
                       "actions":[{"id":"received","label":"Bolo issued","variant":"default"}]}}},

    {"id":"final_receipt","type":"custom","position":{"x":1820,"y":520},
     "data":{"label":"16. Receive payment and give receipt","category":"actions","nodeType":"human_task",
             "config":{"title":"16. Receive payment and give receipt",
                       "assignee_role":"finance",
                       "fields":[
                         {"key":"receipt_number","label":"Receipt #","type":"text","required":true},
                         {"key":"received_at","label":"Received at","type":"datetime","required":true}
                       ],
                       "actions":[{"id":"closed","label":"Close inspection","variant":"default"}]}}},

    {"id":"end","type":"custom","position":{"x":2080,"y":520},
     "data":{"label":"End","category":"actions","nodeType":"action_log",
             "config":{"message":"Fleet Inspection workflow completed"}}}
  ]$J$::jsonb;

  -- Edges; sourceHandle = action id of the source node (used by runner to branch)
  v_edges := $J$[
    {"id":"e1","source":"start","target":"list_vehicles"},
    {"id":"e2","source":"list_vehicles","target":"make_ready","sourceHandle":"submitted"},
    {"id":"e3","source":"make_ready","target":"inspection_type","sourceHandle":"ready"},

    {"id":"e4a","source":"inspection_type","target":"request_maint","sourceHandle":"internal"},
    {"id":"e4b","source":"inspection_type","target":"develop_schedule","sourceHandle":"annual"},

    {"id":"e5","source":"request_maint","target":"assign_inspector","sourceHandle":"requested"},
    {"id":"e6","source":"assign_inspector","target":"pass_internal","sourceHandle":"assigned"},
    {"id":"e7a","source":"pass_internal","target":"ready_for_trip","sourceHandle":"yes"},
    {"id":"e7b","source":"pass_internal","target":"manage_breakdown","sourceHandle":"no"},
    {"id":"e8","source":"manage_breakdown","target":"request_maint","sourceHandle":"reinspect"},

    {"id":"e9","source":"develop_schedule","target":"send_to_center","sourceHandle":"scheduled"},
    {"id":"e10","source":"send_to_center","target":"perform_inspection","sourceHandle":"sent"},
    {"id":"e11","source":"perform_inspection","target":"pass_annual","sourceHandle":"completed"},
    {"id":"e12a","source":"pass_annual","target":"give_certificate","sourceHandle":"yes"},
    {"id":"e12b","source":"pass_annual","target":"send_back","sourceHandle":"no"},
    {"id":"e13","source":"send_back","target":"develop_schedule","sourceHandle":"sent_back"},
    {"id":"e14","source":"give_certificate","target":"raise_payment","sourceHandle":"issued"},
    {"id":"e15","source":"raise_payment","target":"request_advance","sourceHandle":"raised"},
    {"id":"e16","source":"request_advance","target":"finance_confirm","sourceHandle":"requested"},
    {"id":"e17","source":"finance_confirm","target":"receive_advance","sourceHandle":"approve"},
    {"id":"e17b","source":"finance_confirm","target":"raise_payment","sourceHandle":"reject"},
    {"id":"e18","source":"receive_advance","target":"authority_receive","sourceHandle":"paid"},
    {"id":"e19","source":"authority_receive","target":"final_receipt","sourceHandle":"received"},
    {"id":"e20","source":"final_receipt","target":"end","sourceHandle":"closed"}
  ]$J$::jsonb;

  -- Update both org-scoped Fleet Inspection workflows
  FOR v_org IN
    SELECT DISTINCT organization_id FROM workflows WHERE name = 'Fleet Inspection (Builder)'
  LOOP
    UPDATE workflows
       SET nodes = v_nodes,
           edges = v_edges,
           description = 'FMG-INS 01 — Manage Fleet Inspection request (internal & annual). 22 nodes, 24 edges, full SOP automation.',
           category = 'maintenance',
           status = 'active',
           version = COALESCE(version, 1) + 1,
           updated_at = now()
     WHERE name = 'Fleet Inspection (Builder)'
       AND organization_id = v_org;
  END LOOP;
END $$;