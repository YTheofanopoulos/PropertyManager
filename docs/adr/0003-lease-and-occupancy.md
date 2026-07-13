
# ADR 0003: Lease and occupancy model

## Context

Units are durable property assets. Leases are time-bound agreements that may be
fixed-term or month-to-month and may include multiple leaseholders and optional
recurring charges.

## Decision

- A saved lease remains attached to its original unit.
- A lease requires one or more participants and exactly one primary participant.
- Overlapping non-terminated leases for the same unit are rejected.
- Apartment rent, parking, storage, and other monthly amounts are stored as
  recurring charges.
- Unit occupancy is refreshed from lease activity when a lease changes.
- Units with history are retained and should be made inactive rather than deleted.

## Consequences

The model supports Québec-oriented residential leasing without assuming a
mandatory security deposit. Parking and storage can be charged independently
from apartment rent.
