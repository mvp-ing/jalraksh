import os
import json
import random
import datetime
import hashlib
import pandas as pd
from faker import Faker
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib import colors

# ==========================================
# CONFIGURATION (script-local paths)
# ==========================================
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_BASE = SCRIPT_DIR  # place outputs next to this script
PDF_DIR = os.path.join(OUTPUT_BASE, "pdfs")
META_DIR = os.path.join(OUTPUT_BASE, "metadata")
CSV_FILE_PATH = os.path.join(SCRIPT_DIR, "..", "Sensor Stream", "Indian_water_data.csv")

NUM_RECORDS = 50
EXPIRED_RATIO = 0.40   # 40% of factories will be EXPIRED
CURRENT_YEAR = 2025    # Baseline date for the demo

# Ensure output folders
os.makedirs(PDF_DIR, exist_ok=True)
os.makedirs(META_DIR, exist_ok=True)

fake = Faker('en_IN')

# ==========================================
# 1. INTELLIGENT INDUSTRY PROFILING
# ==========================================
def get_industry_profile(row):
    """Decides Industry Type based on pollution values."""
    def get_val(col_partial):
        col = next((c for c in row.index if col_partial.lower() in str(c).lower()), None)
        if col:
            val = row[col]
            if pd.notnull(val):
                s = str(val).strip()
                if s.upper() in {"BDL", "-", ""}:
                    return 0
                try:
                    return float(s)
                except Exception:
                    return 0
        return 0

    cond = get_val('Conductivity')
    fecal = get_val('Fecal Coliform')
    bod = get_val('BOD')
    temp = get_val('Temperature')

    if cond > 2000:
        return {
            'type': 'Textile Dyeing & Bleaching',
            'act_section': 'Section 25 of Water Act 1974',
            'pollutant_focus': 'Total Dissolved Solids (TDS)',
            'suffixes': ['Tex', 'Fabrics', 'Dyeing', 'Spinning', 'Colors'],
            'vol_range': (150, 800)
        }
    elif fecal > 5000:
        return {
            'type': 'Common Effluent Treatment Plant',
            'act_section': 'Rule 6 of Hazardous Waste Rules 2016',
            'pollutant_focus': 'Bacteriological / Fecal Coliform',
            'suffixes': ['Enviro', 'Waste Solutions', 'Utilities', 'Bio-Energy'],
            'vol_range': (500, 2000)
        }
    elif temp > 35:
        return {
            'type': 'Thermal Power Station',
            'act_section': 'Section 21 of Air Act 1981',
            'pollutant_focus': 'Thermal Discharge',
            'suffixes': ['Power', 'Energy', 'Thermal', 'Electricity'],
            'vol_range': (800, 3000)
        }
    elif bod > 30:
        return {
            'type': 'Food Processing / Distillery',
            'act_section': 'Section 25 of Water Act 1974',
            'pollutant_focus': 'Organic Load (BOD)',
            'suffixes': ['Agro', 'Foods', 'Distilleries', 'Brewery', 'Sugar'],
            'vol_range': (50, 300)
        }
    else:
        return {
            'type': 'Light Engineering / Assembly',
            'act_section': 'Section 25 of Water Act 1974',
            'pollutant_focus': 'Oil & Grease',
            'suffixes': ['Engineering', 'Motors', 'Auto Parts', 'Steels', 'Alloys'],
            'vol_range': (2, 12)
        }

# ==========================================
# 2. GENERATOR FUNCTION
# ==========================================
def generate_record(index, row):
    profile = get_industry_profile(row)

    # A. Data Synthesis
    company_name = f"{fake.last_name()} {random.choice(profile['suffixes'])} Pvt Ltd"
    loc_name = str(row.get('Monitoring Location', 'Unknown')).title()
    state_name = str(row.get('State Name', 'India')).upper()
    stn_code = str(row.get('STN code', 'Unknown'))

    # Date Logic (Relative to 2025)
    is_expired = random.random() < EXPIRED_RATIO
    if is_expired:
        exp_year = CURRENT_YEAR - random.randint(1, 2)  # 2023/24
        valid_upto = f"31/03/{exp_year}"
        status = "EXPIRED"
        color_status = colors.red
    else:
        exp_year = CURRENT_YEAR + random.randint(2, 5)  # 2027+
        valid_upto = f"31/03/{exp_year}"
        status = "ACTIVE"
        color_status = colors.green

    license_id = f"PCB/{state_name[:3]}/{CURRENT_YEAR-4}/{random.randint(10000, 99999)}"
    app_no = f"APP-{random.randint(100000, 999999)}"

    # Volume Logic
    vol_min, vol_max = profile['vol_range']
    auth_discharge = random.randint(vol_min, vol_max)

    # B. Geospatial Logic (explicit latitude/longitude)
    try:
        base_lat = float(row.get('latitude', row.get('Latitude', row.get('LATITUDE', 20.5937))))
    except Exception:
        base_lat = 20.5937
    try:
        base_lon = float(row.get('longitude', row.get('Longitude', row.get('LONGITUDE', 78.9629))))
    except Exception:
        base_lon = 78.9629

    # Jitter (~200-500m)
    jitter_lat = random.uniform(-0.005, 0.005)
    jitter_lon = random.uniform(-0.005, 0.005)

    # C. JSON Metadata
    metadata = {
        "record_id": index,
        "license_id": license_id,
        "company_name": company_name,
        "industry_type": profile['type'],
        "location_hint": loc_name,
        "station_code_ref": stn_code,
        "state": state_name,
        "status": status,
        "valid_upto": valid_upto,
        "authorized_limits": {
            "max_discharge_kld": auth_discharge,
            "primary_pollutant": profile['pollutant_focus']
        },
        "geolocation": {
            "lat": round(base_lat + jitter_lat, 6),
            "lon": round(base_lon + jitter_lon, 6)
        },
        "compliance_history": {
            "last_inspection": f"15/04/{CURRENT_YEAR-1}",
            "bank_guarantee_amt": "5,00,000"
        },
        "search_keywords": [
            "Consolidated Consent & Authorization (CC&A)",
            profile['pollutant_focus'],
            "Hazardous Waste (Chemical Sludge) Authorization"
        ]
    }

    # Wrap as Government API-like response
    # sys_header: static-like API info; payload: our metadata; integrity: simple hash
    state_prefix = (state_name.split()[0][:4] if state_name else "STATE").upper()
    sys_header = {
        "api_ver": "2.4.1",
        "source": f"{state_prefix}_PCB_E_GOVERNANCE_GRID",
        "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
        "req_id": f"REQ-{random.randint(100000, 999999)}"
    }
    integrity = {
        "hash": hashlib.sha256(json.dumps(metadata, sort_keys=True).encode("utf-8")).hexdigest()[:16],
        "status": "VERIFIED"
    }
    api_response = {
        "sys_header": sys_header,
        "payload": metadata,
        "integrity": integrity
    }

    with open(os.path.join(META_DIR, f"{license_id.replace('/', '_')}.json"), 'w', encoding='utf-8') as f:
        json.dump(api_response, f, ensure_ascii=False, indent=2)

    # D. PDF Generation
    pdf_path = os.path.join(PDF_DIR, f"{license_id.replace('/', '_')}.pdf")
    c = canvas.Canvas(pdf_path, pagesize=A4)
    width, height = A4

    # Header
    c.setStrokeColor(colors.black)
    c.setLineWidth(1)
    c.rect(40, 770, 60, 60)  # Logo box
    c.setFont("Helvetica-Bold", 8)
    c.drawString(45, 795, "PCB LOGO")

    c.setFont("Helvetica-Bold", 14)
    c.drawCentredString(width/2 + 20, 810, f"{state_name} POLLUTION CONTROL BOARD")
    c.setFont("Helvetica", 10)
    c.drawCentredString(width/2 + 20, 795, "Paryavaran Bhavan, Sector-10A, Phase II")
    c.drawCentredString(width/2 + 20, 782, "Environment Surveillance Division")
    c.line(30, 765, 565, 765)

    # Refs & Subject
    y = 740
    c.setFont("Helvetica-Bold", 10)
    c.drawString(40, y, f"ORDER NO: {license_id}")
    c.drawRightString(550, y, f"Date: 20/12/{CURRENT_YEAR}")
    y -= 25
    c.drawString(40, y, "BY REGISTERED POST A.D.")
    y -= 30

    c.drawString(40, y, "SUB:")
    c.setFont("Helvetica", 10)
    c.drawString(70, y, f"Grant of 'Consent to Operate' (CTO) under {profile['act_section']}")
    y -= 12
    c.drawString(70, y, "and Authorization under Hazardous Waste Rules, 2016.")
    y -= 25

    c.setFont("Helvetica-Bold", 10)
    c.drawString(40, y, "REF:")
    c.setFont("Helvetica", 10)
    c.drawString(70, y, f"1. Your Application No. {app_no} dated 14/02/{CURRENT_YEAR-1}")
    y -= 12
    c.drawString(70, y, f"2. Inspection Report of Regional Officer dated 15/04/{CURRENT_YEAR-1}")
    y -= 30

    # Main Body
    c.setFont("Helvetica", 10)
    c.drawString(40, y, "In exercise of the powers conferred under Section-25 of the Water (Prevention")
    y -= 14
    c.drawString(40, y, "and Control of Pollution) Act-1974, the Board grants Consent to Operate to:")
    y -= 20

    c.setFont("Helvetica-Bold", 11)
    c.drawString(40, y, f"M/s. {company_name}")
    y -= 14

    # STN Code line (requested)
    c.setFont("Helvetica", 10)
    c.drawString(40, y, f"STN Code: {stn_code}")
    y -= 14

    # Address wrapping
    address_line = f"Plot No. {random.randint(100,999)}, Ind. Area, Near {loc_name}"
    if len(address_line) > 85:
        c.drawString(40, y, address_line[:85] + "-")
        y -= 12
        c.drawString(40, y, address_line[85:])
    else:
        c.drawString(40, y, address_line)
    y -= 14
    c.drawString(40, y, f"Dist: {state_name}, India.")
    y -= 25

    c.drawString(40, y, "The consent is valid for the manufacture of products and discharge of effluent.")
    y -= 40  # extra space to avoid overlap

    # Validity & Stamp
    c.setFont("Helvetica-Bold", 10)
    c.drawString(40, y, f"VALID UPTO: {valid_upto} ({status})")

    c.saveState()
    c.translate(350, y-5)
    c.rotate(15)
    c.setStrokeColor(color_status)
    c.setLineWidth(2)
    c.rect(0, 0, 120, 35)
    c.setFillColor(color_status)
    c.setFont("Helvetica-Bold", 18)
    c.drawCentredString(60, 10, status)
    c.restoreState()

    y -= 40
    c.setFillColor(colors.black)
    c.drawString(40, y, "SCHEDULE I: AUTHORIZED DISCHARGE LIMITS")
    y -= 15

    # Table
    c.rect(40, y-50, 515, 50)
    c.line(40, y-20, 555, y-20)
    c.line(300, y, 300, y-50)

    c.setFont("Helvetica-Bold", 9)
    c.drawString(50, y-14, "PARAMETER")
    c.drawString(310, y-14, "PERMISSIBLE LIMIT")

    c.setFont("Helvetica", 9)
    c.drawString(50, y-34, "1. Maximum Water Discharge")
    c.drawString(310, y-34, f"{auth_discharge} KLD (Max)")
    c.drawString(50, y-46, "2. Primary Pollutant")
    c.drawString(310, y-46, f"{profile['pollutant_focus']} < Standard Limit")

    # Specific Conditions
    y -= 90
    c.setFont("Helvetica-Bold", 10)
    c.drawString(40, y, "SPECIFIC CONDITIONS:")
    c.setFont("Helvetica", 9)
    y -= 15

    conds = [
        "1. Portholes and platforms shall be provided at chimney(s) for monitoring emissions.",
        "2. Noise levels must remain within ambient air quality standards.",
        "3. Bank Guarantee of Rs. 5,00,000/- shall be forfeited if Zero Liquid Discharge (ZLD) is violated.",
        "4. Flow meters must be electromagnetic and connected to the SPCB server for real-time data.",
        "5. Separate energy meters shall be installed for the Effluent Treatment Plant (ETP)."
    ]

    for cond in conds:
        c.drawString(40, y, cond)
        y -= 12

    # Footer
    y = 80
    c.setFont("Helvetica-Bold", 10)
    c.drawString(40, y, "Copy To:")
    c.setFont("Helvetica", 8)
    y -= 12
    c.drawString(50, y, "1. The Regional Officer, SPCB.")
    y -= 10
    c.drawString(50, y, "2. The District Magistrate/Collector.")
    y -= 10
    c.drawString(50, y, "3. Master File.")

    c.setFont("Courier", 8)
    c.drawCentredString(width/2, 40, "This is a computer-generated Order thru XGN, does NOT require Physical Signature.")

    c.save()
    return company_name

# ==========================================
# 3. MAIN EXECUTION
# ==========================================
if __name__ == "__main__":
    print(f"Loading Sensor Data from {CSV_FILE_PATH}...")
    try:
        try:
            df = pd.read_csv(CSV_FILE_PATH, encoding='utf-8')
        except UnicodeDecodeError:
            df = pd.read_csv(CSV_FILE_PATH, encoding='ISO-8859-1')

        print(f"Found {len(df)} rows. Generating {NUM_RECORDS} Records...")
        subset = df.sample(n=min(NUM_RECORDS, len(df))).reset_index(drop=True)

        for idx, row in subset.iterrows():
            name = generate_record(idx, row)
            if idx % 10 == 0:
                print(f"[{idx}/{NUM_RECORDS}] Generated {name}...")

        print(f"\nSUCCESS! PDFs -> {PDF_DIR}")
        print(f"SUCCESS! JSONs -> {META_DIR}")

    except FileNotFoundError:
        print(f"ERROR: Could not find {CSV_FILE_PATH}. Please check the path.")
