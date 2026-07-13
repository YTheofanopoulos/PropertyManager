from __future__ import annotations

from datetime import date, timedelta
from functools import lru_cache
import random

from faker import Faker

fake = Faker()
Faker.seed(20260712)
random.seed(20260712)

PROPERTY_DEFS = [
    ("Oakwood Apartments", "Detroit", "MI", 14),
    ("Maple Ridge", "Royal Oak", "MI", 10),
    ("Lakeview Villas", "St. Clair Shores", "MI", 8),
    ("Pine Terrace", "Ferndale", "MI", 6),
    ("Riverside Commons", "Dearborn", "MI", 7),
    ("Cedar Court", "Livonia", "MI", 5),
]

@lru_cache(maxsize=1)
def dataset():
    properties = []
    units = []
    tenants = []
    leases = []
    payments = []
    maintenance = []

    unit_id = 1
    tenant_id = 1
    lease_id = 1
    payment_id = 1
    maintenance_id = 1

    occupied_target = 47
    occupied_count = 0

    for property_id, (name, city, state, unit_count) in enumerate(PROPERTY_DEFS, start=1):
        street = fake.street_address()
        property_units = []
        for idx in range(1, unit_count + 1):
            occupied = occupied_count < occupied_target
            unit_number = f"{(idx // 10) + 1}{idx % 10:02d}"
            bedrooms = random.choice([1, 2, 2, 3])
            bathrooms = random.choice([1.0, 1.0, 1.5, 2.0])
            rent = random.randrange(900, 1801, 25)
            status = "Occupied" if occupied else "Vacant"
            unit = {
                "id": unit_id,
                "property_id": property_id,
                "property": name,
                "unit_number": unit_number,
                "bedrooms": bedrooms,
                "bathrooms": bathrooms,
                "rent": rent,
                "status": status,
            }
            units.append(unit)
            property_units.append(unit)

            if occupied:
                person_name = fake.name()
                email = fake.email()
                phone = fake.phone_number()
                balance = random.choice([0, 0, 0, 0, 150, 350, 925, 1200])
                tenant = {
                    "id": tenant_id,
                    "name": person_name,
                    "email": email,
                    "phone": phone,
                    "property": name,
                    "unit": unit_number,
                    "balance": balance,
                    "status": "Current" if balance == 0 else "Past Due",
                }
                tenants.append(tenant)

                start = date.today() - timedelta(days=random.randint(30, 600))
                end = start + timedelta(days=random.choice([365, 365, 730]))
                lease = {
                    "id": lease_id,
                    "tenant": person_name,
                    "property": name,
                    "unit": unit_number,
                    "start_date": start.isoformat(),
                    "end_date": end.isoformat(),
                    "monthly_rent": rent,
                    "status": "Active" if end >= date.today() else "Expired",
                }
                leases.append(lease)

                for month_offset in range(6):
                    paid_on = date.today().replace(day=1) - timedelta(days=30 * month_offset)
                    payments.append({
                        "id": payment_id,
                        "tenant": person_name,
                        "property": name,
                        "unit": unit_number,
                        "date": paid_on.isoformat(),
                        "amount": rent if month_offset else max(rent - balance, 0),
                        "method": random.choice(["ACH", "Check", "Online", "Cash"]),
                        "status": "Posted",
                    })
                    payment_id += 1

                tenant_id += 1
                lease_id += 1
                occupied_count += 1

            unit_id += 1

        occupied_here = sum(1 for u in property_units if u["status"] == "Occupied")
        monthly_rent = sum(u["rent"] for u in property_units if u["status"] == "Occupied")
        properties.append({
            "id": property_id,
            "name": name,
            "address": street,
            "city": city,
            "state": state,
            "units": unit_count,
            "occupied": occupied_here,
            "vacant": unit_count - occupied_here,
            "occupancy_pct": round(occupied_here / unit_count * 100),
            "monthly_rent": monthly_rent,
        })

    priorities = ["Low", "Normal", "High", "Emergency"]
    statuses = ["Open", "In Progress", "Scheduled", "Closed"]
    issues = [
        "Leaking faucet", "HVAC not cooling", "Broken window latch",
        "Garbage disposal jammed", "Hallway light out", "Water heater noise",
        "Door lock sticking", "Drywall repair", "Smoke detector chirping",
    ]
    for _ in range(32):
        unit = random.choice(units)
        maintenance.append({
            "id": maintenance_id,
            "property": unit["property"],
            "unit": unit["unit_number"],
            "opened": (date.today() - timedelta(days=random.randint(0, 45))).isoformat(),
            "priority": random.choice(priorities),
            "status": random.choice(statuses),
            "description": random.choice(issues),
        })
        maintenance_id += 1

    return {
        "properties": properties,
        "units": units,
        "tenants": tenants,
        "leases": leases,
        "payments": payments,
        "maintenance": maintenance,
    }

def dashboard_data():
    data = dataset()
    total_units = len(data["units"])
    occupied = sum(1 for u in data["units"] if u["status"] == "Occupied")
    monthly_rent = sum(u["rent"] for u in data["units"] if u["status"] == "Occupied")
    past_due = sum(t["balance"] for t in data["tenants"])
    return {
        "cards": [
            {"title": "Occupancy", "value": f"{occupied} / {total_units}", "detail": f"{round(occupied / total_units * 100)}%", "icon": "building", "tone": "success"},
            {"title": "Monthly Rent", "value": f"${monthly_rent:,.0f}", "detail": "scheduled", "icon": "dollar-sign", "tone": "primary"},
            {"title": "Past Due", "value": f"${past_due:,.0f}", "detail": f"{sum(1 for t in data['tenants'] if t['balance'] > 0)} tenants", "icon": "triangle-exclamation", "tone": "danger"},
            {"title": "Vacancies", "value": str(total_units - occupied), "detail": "available units", "icon": "door-open", "tone": "warning"},
        ],
        "properties": data["properties"],
        "recent_payments": list(reversed(data["payments"][-8:])),
        "maintenance": data["maintenance"][:8],
        "expiring_leases": sorted(data["leases"], key=lambda x: x["end_date"])[:8],
        "income_labels": ["Feb", "Mar", "Apr", "May", "Jun", "Jul"],
        "income_values": [47500, 49250, 50100, 50875, 51750, monthly_rent - past_due],
        "occupancy_labels": [p["name"] for p in data["properties"]],
        "occupancy_values": [p["occupancy_pct"] for p in data["properties"]],
    }
