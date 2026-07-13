from __future__ import annotations

from datetime import date, timedelta
from functools import lru_cache
import random
from faker import Faker

fake = Faker("fr_CA")
Faker.seed(20260713)
random.seed(20260713)

PORTFOLIO = [
    ("Edouard-Charles", [
        ("383", ["1", "2", "3", "4"]),
        ("385", ["5", "6", "7", "8", "9", "10", "11"]),
        ("387", ["1", "2", "3", "4", "5", "6"]),
        ("389", ["1", "2", "3", "4", "5", "6", "7", "8"]),
    ]),
    ("Jeanne Mance", [
        ("5213", ["A", "B"]),
        ("5215", ["A", "B"]),
        ("5217", [""]),
        ("5219", [""]),
        ("5221", ["A", "B"]),
        ("5223", ["A", "B"]),
    ]),
    ("Clermont", [
        ("116", [""]),
        ("118", [""]),
        ("120", [""]),
        ("122", [""]),
        ("124", [""]),
        ("126", [""]),
    ]),
]

@lru_cache(maxsize=1)
def dataset():
    properties, units, tenants, leases, payments, maintenance = [], [], [], [], [], []
    unit_id = tenant_id = lease_id = payment_id = maintenance_id = 1
    occupied_target = 38
    occupied_count = 0

    for property_id, (street, buildings) in enumerate(PORTFOLIO, start=1):
        location_units = []

        for address, apartment_numbers in buildings:
            for apartment_number in apartment_numbers:
                occupied = occupied_count < occupied_target
                unit_label = f"{address} {apartment_number}".strip()
                rent = random.randrange(850, 1651, 25)

                unit = {
                    "id": unit_id,
                    "property_id": property_id,
                    "property": street,
                    "address": address,
                    "unit_number": apartment_number or "—",
                    "apartment": unit_label,
                    "bedrooms": random.choice([1, 2, 2, 3]),
                    "bathrooms": random.choice([1.0, 1.0, 1.5, 2.0]),
                    "rent": rent,
                    "status": "Occupied" if occupied else "Vacant",
                }
                units.append(unit)
                location_units.append(unit)

                if occupied:
                    tenant_name = fake.name()
                    balance = random.choice([0, 0, 0, 0, 0, 175, 425, 950])
                    leaseholders = [tenant_name]

                    if lease_id in {3, 8, 14, 21, 29}:
                        leaseholders.append(fake.name())

                    if lease_id in {8, 21}:
                        leaseholders.append(fake.name())

                    primary_tenant_id = tenant_id

                    for holder_index, holder_name in enumerate(leaseholders):
                        holder_balance = balance if holder_index == 0 else 0
                        tenants.append({
                            "id": tenant_id,
                            "name": holder_name,
                            "email": fake.email(),
                            "phone": fake.phone_number(),
                            "property": street,
                            "unit": unit_label,
                            "lease_id": lease_id,
                            "primary_tenant": holder_index == 0,
                            "balance": holder_balance,
                            "status": "Current" if holder_balance == 0 else "Past Due",
                        })
                        tenant_id += 1

                    start = date.today() - timedelta(days=random.randint(30, 600))
                    end = start + timedelta(days=random.choice([365, 365, 730]))

                    leases.append({
                        "id": lease_id,
                        "tenant": tenant_name,
                        "tenants": leaseholders,
                        "tenant_display": " / ".join(leaseholders),
                        "tenant_count": len(leaseholders),
                        "primary_tenant_id": primary_tenant_id,
                        "property": street,
                        "unit": unit_label,
                        "start_date": start.isoformat(),
                        "end_date": end.isoformat(),
                        "monthly_rent": rent,
                        "status": "Active" if end >= date.today() else "Expired",
                    })

                    for month_offset in range(6):
                        paid_on = date.today().replace(day=1) - timedelta(days=30 * month_offset)
                        payments.append({
                            "id": payment_id,
                            "tenant": tenant_name,
                            "property": street,
                            "unit": unit_label,
                            "date": paid_on.isoformat(),
                            "amount": rent if month_offset else max(rent - balance, 0),
                            "method": random.choice(["ACH", "Check", "Online", "Cash"]),
                            "status": "Posted",
                        })
                        payment_id += 1

                    lease_id += 1
                    occupied_count += 1

                unit_id += 1

        occupied_here = sum(u["status"] == "Occupied" for u in location_units)
        properties.append({
            "id": property_id,
            "name": street,
            "address": ", ".join(address for address, _ in buildings),
            "city": "Montréal",
            "units": len(location_units),
            "occupied": occupied_here,
            "vacant": len(location_units) - occupied_here,
            "occupancy_pct": round(occupied_here / len(location_units) * 100),
            "monthly_rent": sum(u["rent"] for u in location_units if u["status"] == "Occupied"),
        })

    issues = [
        "Leaking faucet", "HVAC not cooling", "Broken window latch",
        "Hallway light out", "Water heater noise", "Door lock sticking",
        "Drywall repair", "Smoke detector chirping",
    ]
    for _ in range(28):
        unit = random.choice(units)
        maintenance.append({
            "id": maintenance_id,
            "property": unit["property"],
            "unit": f"{unit['address']} {unit['unit_number']}".replace(" —", ""),
            "opened": (date.today() - timedelta(days=random.randint(0, 45))).isoformat(),
            "priority": random.choice(["Low", "Normal", "High", "Emergency"]),
            "status": random.choice(["Open", "In Progress", "Scheduled", "Closed"]),
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
    occupied = sum(u["status"] == "Occupied" for u in data["units"])
    monthly_rent = sum(u["rent"] for u in data["units"] if u["status"] == "Occupied")
    past_due = sum(t["balance"] for t in data["tenants"])

    return {
        "cards": [
            {"title": "Occupancy", "value": f"{occupied} / {total_units}", "detail": f"{round(occupied / total_units * 100)}%", "icon": "building", "tone": "success"},
            {"title": "Monthly Rent", "value": f"${monthly_rent:,.0f}", "detail": "scheduled", "icon": "dollar-sign", "tone": "primary"},
            {"title": "Past Due", "value": f"${past_due:,.0f}", "detail": f"{sum(t['balance'] > 0 for t in data['tenants'])} tenants", "icon": "triangle-exclamation", "tone": "danger"},
            {"title": "Vacancies", "value": str(total_units - occupied), "detail": "available apartments", "icon": "door-open", "tone": "warning"},
        ],
        "properties": data["properties"],
        "recent_payments": list(reversed(data["payments"][-8:])),
        "maintenance": data["maintenance"][:8],
        "expiring_leases": sorted(data["leases"], key=lambda x: x["end_date"])[:8],
        "income_labels": ["Feb", "Mar", "Apr", "May", "Jun", "Jul"],
        "income_values": [39250, 40100, 40750, 41450, 42025, monthly_rent - past_due],
        "occupancy_labels": [p["name"] for p in data["properties"]],
        "occupancy_values": [p["occupancy_pct"] for p in data["properties"]],
    }
