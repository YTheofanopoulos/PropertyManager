#!/usr/bin/python3

from datetime import date
from sqlalchemy import (
    create_engine,
    Column,
    Integer,
    String,
    Date,
    DateTime,
    Numeric,
    ForeignKey,
    Boolean,
    Text,
    func
)
from sqlalchemy.orm import declarative_base, relationship

# --------------------------------------------------------------------
# Configure your MariaDB connection
# Requires:
#   pip install sqlalchemy pymysql
#   or
#   apt install python3-sqlalchemy
# --------------------------------------------------------------------

# Configure the line below for your local datatabase
DATABASE_URL = "mysql+pymysql://username:password@localhost/property_manager"

engine = create_engine(DATABASE_URL, echo=True)

Base = declarative_base()

# --------------------------------------------------------------------
# Properties
# --------------------------------------------------------------------

class Property(Base):
    __tablename__ = "properties"

    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    address = Column(String(255))
    city = Column(String(100))
    state = Column(String(50))
    zip_code = Column(String(15))

    units = relationship("Unit", back_populates="property")


# --------------------------------------------------------------------
# Units
# --------------------------------------------------------------------

class Unit(Base):
    __tablename__ = "units"

    id = Column(Integer, primary_key=True)
    property_id = Column(Integer, ForeignKey("properties.id"), nullable=False)

    unit_number = Column(String(20), nullable=False)
    bedrooms = Column(Integer)
    bathrooms = Column(Numeric(3,1))
    square_feet = Column(Integer)
    active = Column(Boolean, default=True)

    property = relationship("Property", back_populates="units")
    leases = relationship("Lease", back_populates="unit")


# --------------------------------------------------------------------
# Tenants
# --------------------------------------------------------------------

class Tenant(Base):
    __tablename__ = "tenants"

    id = Column(Integer, primary_key=True)

    first_name = Column(String(50), nullable=False)
    last_name = Column(String(50), nullable=False)

    phone = Column(String(25))
    email = Column(String(150))

    emergency_contact = Column(String(100))
    emergency_phone = Column(String(25))

    created = Column(DateTime, server_default=func.now())

    leases = relationship("Lease", back_populates="tenant")


# --------------------------------------------------------------------
# Leases
# --------------------------------------------------------------------

class Lease(Base):
    __tablename__ = "leases"

    id = Column(Integer, primary_key=True)

    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    unit_id = Column(Integer, ForeignKey("units.id"), nullable=False)

    start_date = Column(Date, nullable=False)
    end_date = Column(Date)

    monthly_rent = Column(Numeric(10,2), nullable=False)
    security_deposit = Column(Numeric(10,2), default=0)

    active = Column(Boolean, default=True)

    tenant = relationship("Tenant", back_populates="leases")
    unit = relationship("Unit", back_populates="leases")

    charges = relationship("Charge", back_populates="lease")
    payments = relationship("Payment", back_populates="lease")


# --------------------------------------------------------------------
# Monthly Charges
# --------------------------------------------------------------------

class Charge(Base):
    __tablename__ = "charges"

    id = Column(Integer, primary_key=True)

    lease_id = Column(Integer, ForeignKey("leases.id"), nullable=False)

    charge_date = Column(Date, nullable=False)
    due_date = Column(Date, nullable=False)

    description = Column(String(100))
    amount = Column(Numeric(10,2), nullable=False)

    paid = Column(Boolean, default=False)

    lease = relationship("Lease", back_populates="charges")


# --------------------------------------------------------------------
# Payments
# --------------------------------------------------------------------

class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True)

    lease_id = Column(Integer, ForeignKey("leases.id"), nullable=False)

    payment_date = Column(Date, nullable=False)

    amount = Column(Numeric(10,2), nullable=False)

    payment_method = Column(String(30))
    reference = Column(String(100))
    notes = Column(Text)

    lease = relationship("Lease", back_populates="payments")


# --------------------------------------------------------------------
# Vendors
# --------------------------------------------------------------------

class Vendor(Base):
    __tablename__ = "vendors"

    id = Column(Integer, primary_key=True)

    company_name = Column(String(100), nullable=False)
    contact_name = Column(String(100))
    phone = Column(String(25))
    email = Column(String(150))


# --------------------------------------------------------------------
# Maintenance Requests
# --------------------------------------------------------------------

class Maintenance(Base):
    __tablename__ = "maintenance"

    id = Column(Integer, primary_key=True)

    unit_id = Column(Integer, ForeignKey("units.id"))

    vendor_id = Column(Integer, ForeignKey("vendors.id"))

    request_date = Column(Date)
    completed_date = Column(Date)

    description = Column(Text)

    cost = Column(Numeric(10,2))

    status = Column(String(30))


# --------------------------------------------------------------------
# Expenses
# --------------------------------------------------------------------

class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True)

    property_id = Column(Integer, ForeignKey("properties.id"))

    expense_date = Column(Date)

    category = Column(String(50))
    description = Column(Text)

    amount = Column(Numeric(10,2), nullable=False)


# --------------------------------------------------------------------
# Documents
# --------------------------------------------------------------------

class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True)

    lease_id = Column(Integer, ForeignKey("leases.id"))

    file_name = Column(String(255))
    document_type = Column(String(50))

    upload_date = Column(Date, default=date.today)

    path = Column(String(500))


# --------------------------------------------------------------------
# Create all tables
# --------------------------------------------------------------------

if __name__ == "__main__":
    Base.metadata.create_all(engine)
    print("Database schema created successfully.")
