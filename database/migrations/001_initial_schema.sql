-- PropertyManager database schema 1
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version INT NOT NULL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  applied_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB;

CREATE TABLE locations (
  id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  city VARCHAR(255) NOT NULL DEFAULT ''
) ENGINE=InnoDB;

CREATE TABLE buildings (
  id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  location_id BIGINT UNSIGNED NOT NULL,
  civic_address VARCHAR(255) NOT NULL,
  city VARCHAR(255) NOT NULL DEFAULT '',
  state_province VARCHAR(255) NOT NULL DEFAULT '',
  postal_code VARCHAR(32) NOT NULL DEFAULT '',
  CONSTRAINT fk_buildings_location FOREIGN KEY (location_id) REFERENCES locations(id),
  UNIQUE KEY uq_building_location_address (location_id, civic_address)
) ENGINE=InnoDB;

CREATE TABLE units (
  id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  building_id BIGINT UNSIGNED NOT NULL,
  apartment_number VARCHAR(64) NOT NULL,
  bedrooms DECIMAL(4,1) NOT NULL DEFAULT 0,
  bathrooms DECIMAL(4,1) NOT NULL DEFAULT 0,
  monthly_rent DECIMAL(12,2) NOT NULL DEFAULT 0,
  status ENUM('Occupied','Vacant','Maintenance') NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT fk_units_building FOREIGN KEY (building_id) REFERENCES buildings(id),
  UNIQUE KEY uq_unit_building_apartment (building_id, apartment_number),
  KEY ix_units_status (status)
) ENGINE=InnoDB;

CREATE TABLE tenants (
  id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  email VARCHAR(320) NOT NULL DEFAULT '',
  phone VARCHAR(64) NOT NULL DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  KEY ix_tenants_name (last_name, first_name),
  KEY ix_tenants_email (email)
) ENGINE=InnoDB;

CREATE TABLE leases (
  id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  unit_id BIGINT UNSIGNED NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  term_type ENUM('Fixed','Month-to-Month') NOT NULL DEFAULT 'Fixed',
  status ENUM('Active','Expired','Future','Terminated') NOT NULL,
  renewal_status ENUM('Not Started','Renewal Letter Sent','Renewed','Under Dispute','Non-Renewal') NOT NULL DEFAULT 'Not Started',
  renewal_letter_sent_date DATE NULL,
  renewal_response_date DATE NULL,
  renewal_notes TEXT NOT NULL,
  notes TEXT NOT NULL,
  CONSTRAINT fk_leases_unit FOREIGN KEY (unit_id) REFERENCES units(id),
  KEY ix_leases_unit_dates (unit_id, start_date, end_date),
  KEY ix_leases_status (status),
  KEY ix_leases_renewal_status (renewal_status)
) ENGINE=InnoDB;

CREATE TABLE lease_participants (
  id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  lease_id BIGINT UNSIGNED NOT NULL,
  tenant_id BIGINT UNSIGNED NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INT NOT NULL DEFAULT 0,
  CONSTRAINT fk_participants_lease FOREIGN KEY (lease_id) REFERENCES leases(id) ON DELETE CASCADE,
  CONSTRAINT fk_participants_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  UNIQUE KEY uq_lease_tenant (lease_id, tenant_id),
  KEY ix_participants_tenant (tenant_id)
) ENGINE=InnoDB;

CREATE TABLE recurring_charges (
  id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  lease_id BIGINT UNSIGNED NOT NULL,
  charge_type ENUM('Apartment Rent','Parking','Storage','Other') NOT NULL,
  description VARCHAR(255) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  frequency ENUM('Monthly','One-Time') NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  CONSTRAINT fk_charges_lease FOREIGN KEY (lease_id) REFERENCES leases(id) ON DELETE CASCADE,
  KEY ix_charges_lease_dates (lease_id, start_date, end_date)
) ENGINE=InnoDB;

CREATE TABLE lease_concessions (
  id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  lease_id BIGINT UNSIGNED NOT NULL,
  description VARCHAR(255) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  start_period CHAR(7) NOT NULL,
  end_period CHAR(7) NOT NULL,
  comment TEXT NOT NULL,
  CONSTRAINT fk_concessions_lease FOREIGN KEY (lease_id) REFERENCES leases(id) ON DELETE CASCADE,
  KEY ix_concessions_lease_period (lease_id, start_period, end_period)
) ENGINE=InnoDB;

CREATE TABLE rent_obligations (
  id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  lease_id BIGINT UNSIGNED NOT NULL,
  rent_period CHAR(7) NOT NULL,
  expected_amount DECIMAL(12,2) NOT NULL,
  status ENUM('Unpaid','Partially Paid','Paid','Overpaid') NOT NULL,
  created_at DATETIME(6) NOT NULL,
  CONSTRAINT fk_obligations_lease FOREIGN KEY (lease_id) REFERENCES leases(id),
  UNIQUE KEY uq_obligation_lease_period (lease_id, rent_period),
  KEY ix_obligations_status (status)
) ENGINE=InnoDB;

CREATE TABLE payments (
  id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  lease_id BIGINT UNSIGNED NOT NULL,
  tenant_id BIGINT UNSIGNED NULL,
  received_date DATE NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  payment_method ENUM('Electronic Transfer','Cheque','Cash','Direct Deposit','Other') NOT NULL,
  reference VARCHAR(255) NOT NULL,
  notes TEXT NOT NULL,
  source ENUM('Manual','Bank Import') NOT NULL,
  status ENUM('Posted','Voided') NOT NULL DEFAULT 'Posted',
  voided_at DATETIME(6) NULL,
  void_reason TEXT NULL,
  created_at DATETIME(6) NOT NULL,
  CONSTRAINT fk_payments_lease FOREIGN KEY (lease_id) REFERENCES leases(id),
  CONSTRAINT fk_payments_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  KEY ix_payments_received_date (received_date),
  KEY ix_payments_lease (lease_id),
  KEY ix_payments_status (status)
) ENGINE=InnoDB;

CREATE TABLE payment_allocations (
  id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  payment_id BIGINT UNSIGNED NOT NULL,
  obligation_id BIGINT UNSIGNED NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  CONSTRAINT fk_allocations_payment FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE,
  CONSTRAINT fk_allocations_obligation FOREIGN KEY (obligation_id) REFERENCES rent_obligations(id),
  UNIQUE KEY uq_payment_obligation (payment_id, obligation_id)
) ENGINE=InnoDB;

CREATE TABLE bank_import_batches (
  id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  filename VARCHAR(255) NOT NULL,
  imported_at DATETIME(6) NOT NULL,
  account_last_four CHAR(4) NOT NULL,
  currency CHAR(3) NOT NULL,
  statement_start DATE NOT NULL,
  statement_end DATE NOT NULL,
  transaction_count INT NOT NULL,
  total_credits DECIMAL(14,2) NOT NULL,
  total_debits DECIMAL(14,2) NOT NULL,
  new_transaction_count INT NOT NULL,
  duplicate_count INT NOT NULL,
  status ENUM('Previewed','Imported') NOT NULL,
  KEY ix_batches_imported_at (imported_at)
) ENGINE=InnoDB;

CREATE TABLE bank_transactions (
  id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  import_batch_id BIGINT UNSIGNED NOT NULL,
  external_id VARCHAR(255) NOT NULL,
  account_last_four CHAR(4) NOT NULL,
  posted_date DATE NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  transaction_type VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  memo TEXT NOT NULL,
  status ENUM('Unmatched','Suggested','Reconciled','Ignored','Duplicate') NOT NULL,
  matched_payment_id BIGINT UNSIGNED NULL,
  ignored_reason TEXT NULL,
  created_at DATETIME(6) NOT NULL,
  CONSTRAINT fk_transactions_batch FOREIGN KEY (import_batch_id) REFERENCES bank_import_batches(id),
  CONSTRAINT fk_transactions_payment FOREIGN KEY (matched_payment_id) REFERENCES payments(id),
  UNIQUE KEY uq_bank_external (account_last_four, external_id),
  KEY ix_transactions_status_date (status, posted_date)
) ENGINE=InnoDB;

CREATE TABLE reconciliation_history (
  id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  bank_transaction_id BIGINT UNSIGNED NOT NULL,
  payment_id BIGINT UNSIGNED NOT NULL,
  lease_id BIGINT UNSIGNED NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  posted_date DATE NOT NULL,
  posted_day INT NOT NULL,
  normalized_name VARCHAR(255) NOT NULL,
  normalized_memo TEXT NOT NULL,
  created_at DATETIME(6) NOT NULL,
  CONSTRAINT fk_recon_transaction FOREIGN KEY (bank_transaction_id) REFERENCES bank_transactions(id),
  CONSTRAINT fk_recon_payment FOREIGN KEY (payment_id) REFERENCES payments(id),
  CONSTRAINT fk_recon_lease FOREIGN KEY (lease_id) REFERENCES leases(id),
  KEY ix_recon_lease_amount (lease_id, amount)
) ENGINE=InnoDB;

CREATE TABLE application_settings (
  setting_key VARCHAR(128) NOT NULL PRIMARY KEY,
  setting_value TEXT NOT NULL,
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB;

INSERT INTO schema_migrations(version, name)
VALUES (1, 'initial_schema')
ON DUPLICATE KEY UPDATE name = VALUES(name);
