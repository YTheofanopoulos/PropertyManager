# Property Manager

A lightweight, web-based property management application for managing residential rental properties.

This application is designed for small to medium portfolios (approximately 25–500 units) and focuses on simplicity, maintainability, and long-term extensibility rather than unnecessary complexity.

---

## Objectives

* Manage properties and rental units
* Track tenants and lease history
* Generate monthly rent charges
* Record and apply payments
* Track maintenance requests and vendors
* Record operating expenses
* Store lease and property documents
* Produce common management reports
* Provide a responsive desktop-oriented user interface

---

# Technology Stack

## Backend

* Python 3.13
* Flask
* SQLAlchemy 2.x
* Alembic
* MariaDB

## Frontend

* Bootstrap 4.6
* DataTables.net
* jQuery
* Font Awesome
* Chart.js

## Web Server

* Apache
* mod_wsgi

---

# Design Philosophy

The application follows several principles:

* Thin route handlers
* Business logic contained within service classes
* SQLAlchemy models for persistence
* Metadata-driven forms and tables
* Generic CRUD framework
* Server-side DataTables
* Modular application structure
* Minimal JavaScript
* Bootstrap components used consistently

---

# Major Modules

* Dashboard
* Properties
* Units
* Tenants
* Leases
* Accounting
* Maintenance
* Vendors
* Expenses
* Documents
* Reports
* Administration

---

# Planned Features

## Dashboard

* Occupancy
* Monthly rent
* Vacancies
* Past due balances
* Recent payments
* Lease expirations
* Maintenance summary

## Properties

* Multiple properties
* Unit management
* Occupancy tracking

## Tenants

* Contact information
* Lease history
* Notes
* Documents

## Leases

* Multiple tenants
* Rent amount
* Security deposits
* Late fee configuration
* Lease renewals

## Accounting

* Monthly charge generation
* Payment entry
* Partial payments
* Payment applications
* Expense tracking

## Maintenance

* Work orders
* Vendor tracking
* Cost tracking
* Status history

## Reports

* Rent Roll
* Delinquency
* Occupancy
* Cash Flow
* Income
* Expenses
* Lease Expiration
* Vendor Activity

---

# Coding Standards

* Use Black formatting.
* Follow PEP 8.
* Use type hints whenever practical.
* Avoid inline SQL.
* Database access through SQLAlchemy.
* Services contain business logic.
* Templates contain presentation only.
* Keep JavaScript minimal.

---

# Authentication

Authentication is intentionally excluded from this project.

The application integrates with the existing authentication mechanism already deployed within the hosting environment.

An adapter layer will expose:

* Current user
* User display name
* User permissions

without requiring changes elsewhere in the application.

---

# Database

MariaDB is the primary database.

Database migrations are managed with Alembic.

All schema changes must be introduced through migrations.

---

# Status

This project is currently under active development.

Phase 1 establishes the application framework and reusable infrastructure.

Subsequent phases introduce business functionality incrementally.

