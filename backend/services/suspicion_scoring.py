"""Enhanced Suspicion Scoring Service.

Multi-factor algorithm for calculating factory suspicion scores
based on distance, permit status, industry match, violation history,
temporal correlation, and upstream position.
"""

from dataclasses import dataclass
from datetime import datetime
from typing import Optional, Dict, List, Any
from enum import Enum

from ..config import POLLUTION_CATEGORIES


# Industry-to-Pollution Type Mapping
INDUSTRY_POLLUTION_MAP = {
    "industrial_dye": [
        "Textile Dyeing & Bleaching",
        "Textile Dyeing",
        "Printing Press",
        "Dye Manufacturing",
    ],
    "sewage": [
        "Common Effluent Treatment Plant",
        "Sewage Treatment Plant",
        "STP",
        "CETP",
    ],
    "thermal": [
        "Thermal Power Station",
        "Steel Plant",
        "Power Generation",
        "Foundry",
    ],
    "chemical_industrial": [
        "Chemical Manufacturing",
        "Pharmaceutical",
        "Pesticide Manufacturing",
        "Light Engineering / Assembly",
    ],
    "organic_industrial": [
        "Food Processing",
        "Food Processing / Distillery",
        "Distillery",
        "Leather Tanning",
        "Sugar Mill",
        "Brewery",
    ],
    "agricultural_runoff": [],  # Not typically from factories
}


@dataclass
class SuspicionFactors:
    """Individual factors contributing to suspicion score."""

    distance_score: float  # 0-1, inversely proportional to distance
    permit_status_score: float  # 0-1, expired/revoked = higher
    industry_match_score: float  # 0-1, does factory type match pollution?
    violation_history_score: float  # 0-1, based on past violations
    temporal_correlation_score: float  # 0-1, discharge timing correlation
    upstream_weight: float  # 0-1, position relative to detection point


@dataclass
class SuspicionScore:
    """Complete suspicion score with breakdown."""

    total: float
    factors: SuspicionFactors
    explanation: str
    factor_contributions: Dict[str, float]


class EnhancedSuspicionCalculator:
    """
    Enhanced multi-factor suspicion score calculator.

    Weights:
    - Distance: 25%
    - Permit Status: 15%
    - Industry Match: 25%
    - Violation History: 15%
    - Temporal Correlation: 10%
    - Upstream Position: 10%
    """

    WEIGHTS = {
        "distance": 0.25,
        "permit_status": 0.15,
        "industry_match": 0.25,
        "violation_history": 0.15,
        "temporal_correlation": 0.10,
        "upstream_weight": 0.10,
    }

    def calculate(
        self,
        factory: Dict[str, Any],
        station_lat: float,
        station_lon: float,
        distance_km: float,
        radius_km: float,
        pollution_type: Optional[str] = None,
        detection_time: Optional[datetime] = None,
        trace_depth: int = 0,
        max_depth: int = 5,
    ) -> SuspicionScore:
        """
        Calculate comprehensive suspicion score for a factory.

        Args:
            factory: Factory details dict with license_id, industry_type, status, etc.
            station_lat: Detection station latitude
            station_lon: Detection station longitude
            distance_km: Distance from factory to station
            radius_km: Search radius
            pollution_type: Classified pollution type (if known)
            detection_time: When pollution was detected
            trace_depth: Current depth in upstream trace (0 = detection point)
            max_depth: Maximum trace depth

        Returns:
            SuspicionScore with total score and factor breakdown
        """
        # Calculate individual factors
        factors = SuspicionFactors(
            distance_score=self._calc_distance_score(distance_km, radius_km),
            permit_status_score=self._calc_permit_score(factory),
            industry_match_score=self._calc_industry_match(factory, pollution_type),
            violation_history_score=self._calc_violation_score(factory),
            temporal_correlation_score=self._calc_temporal_score(detection_time),
            upstream_weight=self._calc_upstream_weight(trace_depth, max_depth),
        )

        # Calculate weighted total
        factor_contributions = {
            "distance": factors.distance_score * self.WEIGHTS["distance"],
            "permit_status": factors.permit_status_score * self.WEIGHTS["permit_status"],
            "industry_match": factors.industry_match_score * self.WEIGHTS["industry_match"],
            "violation_history": factors.violation_history_score * self.WEIGHTS["violation_history"],
            "temporal_correlation": factors.temporal_correlation_score * self.WEIGHTS["temporal_correlation"],
            "upstream_weight": factors.upstream_weight * self.WEIGHTS["upstream_weight"],
        }

        total = sum(factor_contributions.values())
        total = min(1.0, max(0.0, total))  # Clamp to 0-1

        explanation = self._generate_explanation(factors, factory, pollution_type)

        return SuspicionScore(
            total=round(total, 3),
            factors=factors,
            explanation=explanation,
            factor_contributions={k: round(v, 3) for k, v in factor_contributions.items()},
        )

    def _calc_distance_score(self, distance_km: float, radius_km: float) -> float:
        """
        Calculate distance score - closer factories are more suspicious.

        Uses inverse linear scaling with minimum at edge of radius.
        """
        if radius_km <= 0:
            return 0.5

        # Inverse linear: 1.0 at distance=0, 0.0 at distance=radius
        score = max(0.0, 1.0 - (distance_km / radius_km))

        # Apply slight boost for very close factories (< 1km)
        if distance_km < 1.0:
            score = min(1.0, score + 0.1)

        return round(score, 3)

    def _calc_permit_score(self, factory: Dict[str, Any]) -> float:
        """
        Calculate permit status score.

        EXPIRED: 1.0 (highest suspicion)
        REVOKED: 0.9 (very high - intentional violation)
        ACTIVE: 0.3 (lower but not zero - still could violate)
        """
        status = factory.get("status", "ACTIVE").upper()

        if status == "EXPIRED":
            return 1.0
        elif status == "REVOKED":
            return 0.9
        else:  # ACTIVE or unknown
            return 0.3

    def _calc_industry_match(
        self,
        factory: Dict[str, Any],
        pollution_type: Optional[str],
    ) -> float:
        """
        Calculate industry-pollution type match score.

        High score if factory type matches the detected pollution type.
        """
        if not pollution_type:
            return 0.5  # Neutral if pollution type unknown

        industry_type = factory.get("industry_type", "").lower()
        matching_industries = INDUSTRY_POLLUTION_MAP.get(pollution_type, [])

        # Exact match
        for industry in matching_industries:
            if industry.lower() in industry_type or industry_type in industry.lower():
                return 1.0

        # Partial match - check keywords
        pollution_keywords = {
            "industrial_dye": ["dye", "textile", "printing", "color"],
            "sewage": ["effluent", "sewage", "treatment", "stp"],
            "thermal": ["thermal", "power", "steel", "foundry"],
            "chemical_industrial": ["chemical", "pharma", "pesticide", "engineering"],
            "organic_industrial": ["food", "distillery", "leather", "sugar", "brewery"],
        }

        keywords = pollution_keywords.get(pollution_type, [])
        for keyword in keywords:
            if keyword in industry_type:
                return 0.7

        # No match - lower suspicion for this pollution type
        return 0.2

    def _calc_violation_score(self, factory: Dict[str, Any]) -> float:
        """
        Calculate violation history score.

        Based on compliance history and bank guarantee amount.
        """
        compliance = factory.get("compliance_history", {})

        # Check violations count if available
        violations = compliance.get("violations_count", 0)
        if violations > 0:
            # Scale: 1 violation = 0.5, 2+ = 0.8, 5+ = 1.0
            if violations >= 5:
                return 1.0
            elif violations >= 2:
                return 0.8
            else:
                return 0.5

        # Infer from bank guarantee (higher guarantee often means riskier industry)
        bank_guarantee = compliance.get("bank_guarantee_amt", 0)
        if isinstance(bank_guarantee, str):
            # Parse string like "5,00,000"
            try:
                bank_guarantee = int(bank_guarantee.replace(",", ""))
            except (ValueError, AttributeError):
                bank_guarantee = 0

        if bank_guarantee > 500000:
            return 0.4
        elif bank_guarantee > 300000:
            return 0.3

        return 0.2  # Default low score

    def _calc_temporal_score(self, detection_time: Optional[datetime]) -> float:
        """
        Calculate temporal correlation score.

        Night-time detection is more suspicious (illegal dumping).
        Weekend detection is also slightly more suspicious.
        """
        if not detection_time:
            return 0.5  # Neutral if time unknown

        hour = detection_time.hour
        day_of_week = detection_time.weekday()

        # Night discharge (10 PM - 5 AM) is suspicious
        if hour >= 22 or hour <= 5:
            return 0.9

        # Weekend discharge
        if day_of_week >= 5:  # Saturday or Sunday
            return 0.6

        # Normal work hours (6 AM - 6 PM)
        if 6 <= hour <= 18:
            return 0.5

        # Evening hours (6 PM - 10 PM)
        return 0.6

    def _calc_upstream_weight(self, trace_depth: int, max_depth: int) -> float:
        """
        Calculate upstream position weight.

        Factories at optimal distance upstream are more suspicious.
        Too close: pollution may not have fully mixed
        Too far: pollution may have diluted
        """
        if max_depth <= 0:
            return 0.5

        # Normalize depth to 0-1 range
        normalized_depth = trace_depth / max_depth

        # Optimal range is 0.2-0.6 of max depth
        # (1-3 hops for typical 5-hop max)
        if 0.2 <= normalized_depth <= 0.6:
            return 0.8
        elif normalized_depth < 0.2:
            # Very close - less time for mixing
            return 0.6
        else:
            # Far upstream - possible dilution
            return 0.4 + 0.2 * (1 - normalized_depth)

    def _generate_explanation(
        self,
        factors: SuspicionFactors,
        factory: Dict[str, Any],
        pollution_type: Optional[str],
    ) -> str:
        """Generate human-readable explanation of suspicion score."""
        explanations = []

        # Distance explanation
        if factors.distance_score >= 0.7:
            explanations.append("Very close to detection point")
        elif factors.distance_score >= 0.4:
            explanations.append("Moderately close to detection point")

        # Permit status explanation
        status = factory.get("status", "").upper()
        if status == "EXPIRED":
            explanations.append("Permit has EXPIRED")
        elif status == "REVOKED":
            explanations.append("Permit was REVOKED")

        # Industry match explanation
        if factors.industry_match_score >= 0.7 and pollution_type:
            industry = factory.get("industry_type", "Unknown")
            explanations.append(f"Industry type ({industry}) matches pollution type")

        # Violation history
        if factors.violation_history_score >= 0.5:
            explanations.append("Has history of violations")

        # Temporal correlation
        if factors.temporal_correlation_score >= 0.7:
            explanations.append("Detection time suggests irregular discharge")

        if not explanations:
            return "Standard suspicion based on proximity and permit status"

        return "; ".join(explanations)


# Singleton instance
_calculator: Optional[EnhancedSuspicionCalculator] = None


def get_suspicion_calculator() -> EnhancedSuspicionCalculator:
    """Get singleton calculator instance."""
    global _calculator
    if _calculator is None:
        _calculator = EnhancedSuspicionCalculator()
    return _calculator
