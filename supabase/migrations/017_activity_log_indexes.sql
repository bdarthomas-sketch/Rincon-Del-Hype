CREATE INDEX idx_activity_log_action ON activity_log(action, created_at DESC);
CREATE INDEX idx_activity_log_entity_action ON activity_log(entity, action);
