"""
Agent Tools for Google ADK / Gemini Function Calling.

Defines tools that the Inspector Agent can use to:
- Get water quality data from sensors
- Lookup factory permits
- Check violation history
- Classify pollution
- Calculate fine amounts
"""

from typing import Optional, Dict, Any, List
from datetime import datetime
import json

from google.generativeai.types import FunctionDeclaration, Tool

from ..config import WATER_QUALITY_THRESHOLDS, POLLUTION_CATEGORIES, SEVERITY_LEVELS


# ========== Tool Function Implementations ==========

class InspectorToolImplementations:
    """
    Actual implementations of the inspector tools.
    These are called when the LLM invokes a tool.
    """

    def __init__(self):
        # Lazy imports to avoid circular dependencies
        self._alert_service = None
        self._permit_service = None
        self._graph_service = None

    @property
    def alert_service(self):
        if self._alert_service is None:
            from .alert_service import get_alert_service
            self._alert_service = get_alert_service()
        return self._alert_service

    @property
    def permit_service(self):
        if self._permit_service is None:
            from .permit_service import get_permit_service
            self._permit_service = get_permit_service()
        return self._permit_service

    @property
    def graph_service(self):
        if self._graph_service is None:
            from .graph_service import get_graph_service
            self._graph_service = get_graph_service()
        return self._graph_service

    def get_water_quality_data(
        self,
        station_code: str,
        date: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Get water quality readings from a monitoring station.

        Args:
            station_code: The station identifier
            date: Optional date filter (YYYY-MM-DD)

        Returns:
            Dict with station info and water quality parameters
        """
        # Get station info
        station = self.graph_service.get_station_info(station_code)
        if not station:
            return {"error": f"Station {station_code} not found"}

        # Get alerts (which contain water quality data)
        alerts = self.alert_service.scan_for_anomalies(
            station_codes=[station_code],
            min_severity=0.0,
            limit=5,
        )

        if alerts:
            latest = alerts[0]
            return {
                "station_code": station_code,
                "station_name": station.get("station_name", "Unknown"),
                "location": station.get("location", ""),
                "river_cluster": station.get("river_cluster", ""),
                "coordinates": [station.get("lat"), station.get("lon")],
                "timestamp": latest.timestamp.isoformat() if latest.timestamp else None,
                "parameters": {
                    "temperature": latest.parameters.temperature,
                    "dissolved_oxygen": latest.parameters.dissolved_oxygen,
                    "ph": latest.parameters.ph,
                    "conductivity": latest.parameters.conductivity,
                    "bod": latest.parameters.bod,
                    "nitrate_n": latest.parameters.nitrate_n,
                    "fecal_coliform": latest.parameters.fecal_coliform,
                    "total_coliform": latest.parameters.total_coliform,
                },
                "severity_score": latest.severity_score,
                "anomaly_type": latest.anomaly_type,
            }

        return {
            "station_code": station_code,
            "station_name": station.get("station_name", "Unknown"),
            "message": "No recent anomaly data available",
        }

    def lookup_factory_permits(
        self,
        lat: float,
        lon: float,
        radius_km: float = 10.0,
    ) -> List[Dict[str, Any]]:
        """
        Search for factory permits near coordinates.

        Args:
            lat: Latitude
            lon: Longitude
            radius_km: Search radius in kilometers

        Returns:
            List of factory details with permit status
        """
        factories = self.permit_service.get_nearby_factories(lat, lon, radius_km)

        return [
            {
                "license_id": f.license_id,
                "company_name": f.company_name,
                "industry_type": f.industry_type,
                "permit_status": f.status.value,
                "valid_upto": f.valid_upto,
                "distance_km": f.distance_from_station_km,
                "coordinates": list(f.coordinates),
                "authorized_discharge_kld": f.authorized_limits.max_discharge_kld,
                "primary_pollutant": f.authorized_limits.primary_pollutant,
            }
            for f in factories[:10]
        ]

    def check_historical_violations(
        self,
        license_id: str,
    ) -> Dict[str, Any]:
        """
        Check violation history for a factory.

        Args:
            license_id: Factory license ID

        Returns:
            Dict with violation history and compliance info
        """
        factory = self.permit_service.get_permit_by_id(license_id)
        if not factory:
            return {"error": f"Factory {license_id} not found"}

        return {
            "license_id": license_id,
            "company_name": factory.company_name,
            "industry_type": factory.industry_type,
            "permit_status": factory.status.value,
            "valid_upto": factory.valid_upto,
            "compliance_history": {
                "last_inspection": factory.compliance_history.last_inspection,
                "bank_guarantee": factory.compliance_history.bank_guarantee,
                "violations_count": factory.compliance_history.violations_count,
            },
            "risk_assessment": self._assess_risk(factory),
        }

    def _assess_risk(self, factory) -> str:
        """Assess risk level of a factory."""
        risk_factors = []

        if factory.status.value == "EXPIRED":
            risk_factors.append("expired permit")
        if factory.compliance_history.violations_count > 0:
            risk_factors.append("history of violations")
        if factory.compliance_history.bank_guarantee and factory.compliance_history.bank_guarantee > 300000:
            risk_factors.append("high bank guarantee (indicates risk)")

        if len(risk_factors) >= 2:
            return f"HIGH - {', '.join(risk_factors)}"
        elif len(risk_factors) == 1:
            return f"MEDIUM - {', '.join(risk_factors)}"
        return "LOW - compliant history"

    def classify_pollution_type(
        self,
        temperature: Optional[float] = None,
        dissolved_oxygen: Optional[float] = None,
        ph: Optional[float] = None,
        conductivity: Optional[float] = None,
        bod: Optional[float] = None,
        nitrate_n: Optional[float] = None,
        fecal_coliform: Optional[float] = None,
        total_coliform: Optional[float] = None,
    ) -> Dict[str, Any]:
        """
        Classify pollution based on water quality parameters.

        Uses rule-based logic to determine likely pollution type.
        """
        # Determine pollution type based on rules
        pollution_type = "Unknown"
        category_key = "chemical_industrial"
        indicators = []
        confidence = 50.0
        ruled_out = []

        # Check for sewage
        if (fecal_coliform and fecal_coliform > 5000) or (total_coliform and total_coliform > 10000):
            pollution_type = "Sewage Contamination"
            category_key = "sewage"
            indicators = ["high_fecal_coliform", "high_total_coliform"]
            confidence = 85.0
            ruled_out = ["Industrial Dye (no conductivity spike)", "Thermal (normal temperature)"]

        # Check for industrial dye
        elif (conductivity and conductivity > 2000) and (ph and (ph < 5.5 or ph > 9.0)):
            pollution_type = "Industrial Dye Discharge"
            category_key = "industrial_dye"
            indicators = ["high_conductivity", "abnormal_ph"]
            confidence = 80.0
            ruled_out = ["Sewage (low coliform)", "Agricultural (high conductivity)"]

        # Check for thermal pollution
        elif temperature and temperature > 38:
            pollution_type = "Thermal Pollution"
            category_key = "thermal"
            indicators = ["high_temperature"]
            if dissolved_oxygen and dissolved_oxygen < 4:
                indicators.append("low_dissolved_oxygen")
            confidence = 75.0
            ruled_out = ["Sewage (thermal signature)"]

        # Check for organic industrial
        elif bod and bod > 30:
            pollution_type = "Organic Industrial Waste"
            category_key = "organic_industrial"
            indicators = ["very_high_bod"]
            confidence = 70.0

        # Check for agricultural runoff
        elif nitrate_n and nitrate_n > 20:
            pollution_type = "Agricultural Runoff"
            category_key = "agricultural_runoff"
            indicators = ["high_nitrate"]
            confidence = 65.0

        category = POLLUTION_CATEGORIES.get(category_key, POLLUTION_CATEGORIES["chemical_industrial"])

        return {
            "pollution_type": pollution_type,
            "category_key": category_key,
            "category_name": category["name"],
            "confidence": confidence,
            "key_indicators": indicators,
            "ruled_out": ruled_out,
            "applicable_act": category["act_section"],
            "base_fine": category["base_fine"],
            "industry_types_to_investigate": category["industry_types"],
        }

    def calculate_fine_amount(
        self,
        pollution_type: str,
        severity_score: float,
        repeat_offender: bool = False,
        expired_permit: bool = False,
    ) -> Dict[str, Any]:
        """
        Calculate appropriate fine based on violation details.

        Args:
            pollution_type: Category key of pollution type
            severity_score: Severity score 0-1
            repeat_offender: Has prior violations
            expired_permit: Permit is expired

        Returns:
            Dict with calculated fine amount and breakdown
        """
        category = POLLUTION_CATEGORIES.get(pollution_type, POLLUTION_CATEGORIES["chemical_industrial"])
        base_fine = category["base_fine"]

        # Apply multipliers
        multipliers = []
        total_multiplier = 1.0

        # Severity multiplier (1.0 - 2.0)
        severity_mult = 1.0 + severity_score
        multipliers.append(f"Severity ({severity_score:.2f}): x{severity_mult:.2f}")
        total_multiplier *= severity_mult

        # Repeat offender multiplier
        if repeat_offender:
            multipliers.append("Repeat offender: x1.5")
            total_multiplier *= 1.5

        # Expired permit multiplier
        if expired_permit:
            multipliers.append("Expired permit: x1.25")
            total_multiplier *= 1.25

        final_fine = base_fine * total_multiplier

        return {
            "base_fine": base_fine,
            "total_multiplier": round(total_multiplier, 2),
            "calculated_fine": round(final_fine, 0),
            "breakdown": multipliers,
            "applicable_act": category["act_section"],
            "pollution_category": category["name"],
        }


# ========== Tool Declarations for Gemini ==========

# Tool: Get Water Quality Data
get_water_quality_data_tool = FunctionDeclaration(
    name="get_water_quality_data",
    description="Retrieve water quality parameters from a monitoring station. Returns temperature, dissolved oxygen, pH, conductivity, BOD, nitrate, and coliform levels.",
    parameters={
        "type": "object",
        "properties": {
            "station_code": {
                "type": "string",
                "description": "The station code/identifier (e.g., '1001', '4356')"
            },
            "date": {
                "type": "string",
                "description": "Optional date filter in YYYY-MM-DD format"
            }
        },
        "required": ["station_code"]
    }
)

# Tool: Lookup Factory Permits
lookup_factory_permits_tool = FunctionDeclaration(
    name="lookup_factory_permits",
    description="Search for factories with industrial permits near given coordinates. Returns company names, permit status, and industry types.",
    parameters={
        "type": "object",
        "properties": {
            "lat": {
                "type": "number",
                "description": "Latitude coordinate"
            },
            "lon": {
                "type": "number",
                "description": "Longitude coordinate"
            },
            "radius_km": {
                "type": "number",
                "description": "Search radius in kilometers (default 10)"
            }
        },
        "required": ["lat", "lon"]
    }
)

# Tool: Check Historical Violations
check_historical_violations_tool = FunctionDeclaration(
    name="check_historical_violations",
    description="Check the violation and compliance history for a specific factory by its license ID.",
    parameters={
        "type": "object",
        "properties": {
            "license_id": {
                "type": "string",
                "description": "Factory license ID (e.g., 'PCB/AND/2021/49869')"
            }
        },
        "required": ["license_id"]
    }
)

# Tool: Classify Pollution Type
classify_pollution_type_tool = FunctionDeclaration(
    name="classify_pollution_type",
    description="Classify the type of pollution based on water quality parameters. Identifies if it's sewage, industrial dye, thermal, chemical, or agricultural pollution.",
    parameters={
        "type": "object",
        "properties": {
            "temperature": {"type": "number", "description": "Temperature in °C"},
            "dissolved_oxygen": {"type": "number", "description": "Dissolved oxygen in mg/L"},
            "ph": {"type": "number", "description": "pH level"},
            "conductivity": {"type": "number", "description": "Conductivity in µmho/cm"},
            "bod": {"type": "number", "description": "BOD in mg/L"},
            "nitrate_n": {"type": "number", "description": "Nitrate-N in mg/L"},
            "fecal_coliform": {"type": "number", "description": "Fecal coliform in MPN/100ml"},
            "total_coliform": {"type": "number", "description": "Total coliform in MPN/100ml"}
        },
        "required": []
    }
)

# Tool: Calculate Fine Amount
calculate_fine_amount_tool = FunctionDeclaration(
    name="calculate_fine_amount",
    description="Calculate the appropriate fine amount based on pollution type, severity, and compliance history.",
    parameters={
        "type": "object",
        "properties": {
            "pollution_type": {
                "type": "string",
                "description": "Pollution category key (e.g., 'sewage', 'industrial_dye', 'thermal')"
            },
            "severity_score": {
                "type": "number",
                "description": "Severity score from 0 to 1"
            },
            "repeat_offender": {
                "type": "boolean",
                "description": "Whether the factory has prior violations"
            },
            "expired_permit": {
                "type": "boolean",
                "description": "Whether the factory's permit is expired"
            }
        },
        "required": ["pollution_type", "severity_score"]
    }
)


# Create the tools collection
INSPECTOR_TOOLS = Tool(
    function_declarations=[
        get_water_quality_data_tool,
        lookup_factory_permits_tool,
        check_historical_violations_tool,
        classify_pollution_type_tool,
        calculate_fine_amount_tool,
    ]
)


# Tool implementations instance
_tool_implementations: Optional[InspectorToolImplementations] = None


def get_tool_implementations() -> InspectorToolImplementations:
    """Get singleton tool implementations instance."""
    global _tool_implementations
    if _tool_implementations is None:
        _tool_implementations = InspectorToolImplementations()
    return _tool_implementations


def execute_tool(tool_name: str, args: Dict[str, Any]) -> Dict[str, Any]:
    """
    Execute a tool by name with given arguments.

    Args:
        tool_name: Name of the tool to execute
        args: Arguments to pass to the tool

    Returns:
        Result from the tool execution
    """
    impl = get_tool_implementations()

    tool_map = {
        "get_water_quality_data": impl.get_water_quality_data,
        "lookup_factory_permits": impl.lookup_factory_permits,
        "check_historical_violations": impl.check_historical_violations,
        "classify_pollution_type": impl.classify_pollution_type,
        "calculate_fine_amount": impl.calculate_fine_amount,
    }

    if tool_name not in tool_map:
        return {"error": f"Unknown tool: {tool_name}"}

    try:
        return tool_map[tool_name](**args)
    except Exception as e:
        return {"error": f"Tool execution failed: {str(e)}"}
