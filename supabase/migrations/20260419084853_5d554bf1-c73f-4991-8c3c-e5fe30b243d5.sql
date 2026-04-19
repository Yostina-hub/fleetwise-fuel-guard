UPDATE workflow_instances 
SET current_stage='closed', current_lane='reporting', status='completed', completed_at=now(),
    data = data || jsonb_build_object('installed_at','2026-04-19T03:00:00Z','km_at_install',127500,'install_notes','Front-left and front-right Michelin 295/80R22.5 installed. Old tires returned to WH-A.')
WHERE id='ed0cf8c2-1407-4450-90af-25bc0f306d75';

INSERT INTO workflow_transitions (organization_id, instance_id, workflow_type, from_stage, to_stage, from_lane, to_lane, decision, notes, performed_by_role, payload)
VALUES ('00000000-0000-0000-0000-000000000001','ed0cf8c2-1407-4450-90af-25bc0f306d75','tire_request','fulfillment','closed','maintenance','reporting','fulfilled','E2E close — UI datetime field bug worked around','super_admin','{"installed_at":"2026-04-19T03:00:00Z","km_at_install":127500}'::jsonb);