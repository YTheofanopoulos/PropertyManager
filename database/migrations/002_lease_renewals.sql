-- PropertyManager database schema 2: successor lease renewal workflow
ALTER TABLE leases
  MODIFY renewal_status ENUM(
    'Not Started','Renewal Letter Sent','Accepted','Renewed',
    'Under Dispute','Non-Renewal'
  ) NOT NULL DEFAULT 'Not Started',
  ADD COLUMN renewal_proposed_rent DECIMAL(12,2) NULL AFTER renewal_status,
  ADD COLUMN previous_lease_id BIGINT UNSIGNED NULL AFTER unit_id,
  ADD CONSTRAINT fk_leases_previous
    FOREIGN KEY (previous_lease_id) REFERENCES leases(id),
  ADD UNIQUE KEY uq_leases_previous (previous_lease_id);

INSERT INTO schema_migrations(version, name)
VALUES (2, 'lease_renewals')
ON DUPLICATE KEY UPDATE name = VALUES(name);
