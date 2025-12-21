"""
Gemini-powered Agent for Pollution Classification and Report Generation.

Uses Google's Generative AI (Gemini) with Function Calling (ADK pattern) to:
1. Investigate pollution alerts step-by-step using tools
2. Classify pollution type from water quality parameters
3. Generate natural language explanations
4. Create fine/violation report content
"""

import json
from typing import Optional, List, Dict, Any, AsyncGenerator
from dataclasses import dataclass, asdict

import google.generativeai as genai

from ..config import get_settings, POLLUTION_CATEGORIES
from ..models.schemas import (
    WaterQualityParameters,
    ClassificationResult,
)


@dataclass
class InvestigationStep:
    """A single step in the investigation process."""
    step_number: int
    action: str
    tool_name: Optional[str]
    tool_args: Optional[Dict[str, Any]]
    result: Optional[Dict[str, Any]]
    reasoning: str

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class InvestigationResult:
    """Complete result of a pollution investigation."""
    alert_id: str
    station_code: str
    steps: List[InvestigationStep]
    classification: Optional[ClassificationResult]
    suspected_factories: List[Dict[str, Any]]
    recommended_fine: Optional[Dict[str, Any]]
    summary: str
    confidence: float

    def to_dict(self) -> Dict[str, Any]:
        return {
            "alert_id": self.alert_id,
            "station_code": self.station_code,
            "steps": [s.to_dict() for s in self.steps],
            "classification": self.classification.model_dump() if self.classification else None,
            "suspected_factories": self.suspected_factories,
            "recommended_fine": self.recommended_fine,
            "summary": self.summary,
            "confidence": self.confidence,
        }


class GeminiAgent:
    """
    Agent for AI-powered pollution analysis using Gemini with Function Calling.

    Supports two modes:
    1. Simple classification (direct LLM call)
    2. Full investigation with tool calling (ADK pattern)
    """

    SYSTEM_PROMPT = """You are an expert Water Pollution Investigation Agent for the JalRakshak system.
Your role is to investigate water pollution alerts and identify the source.

When investigating, follow this process:
1. First, get water quality data from the detection station
2. Classify the pollution type based on the parameters
3. Look up nearby factories that could be the source
4. Check violation history of suspicious factories
5. Calculate an appropriate fine if a violator is identified

Use the available tools to gather information. Think step by step and explain your reasoning.
Be thorough but efficient - gather the information you need to make a determination.

After your investigation, provide:
- A clear classification of the pollution type
- The most likely source (factory) with evidence
- A recommended fine amount if applicable
- Confidence level in your findings (0-100%)

When you have completed your investigation, include "INVESTIGATION COMPLETE" in your response.
"""

    def __init__(self):
        settings = get_settings()
        self.api_key = settings.gemini_api_key
        self.model_name = settings.gemini_model
        self._model = None
        self._model_with_tools = None
        self._configured = False

    def _configure(self):
        """Configure the Gemini API."""
        if self._configured:
            return

        if not self.api_key:
            print("Warning: Gemini API key not configured. Using mock classification.")
            return

        genai.configure(api_key=self.api_key)
        self._model = genai.GenerativeModel(self.model_name)

        # Try to configure model with tools
        try:
            from .agent_tools import INSPECTOR_TOOLS
            self._model_with_tools = genai.GenerativeModel(
                self.model_name,
                tools=[INSPECTOR_TOOLS],
                system_instruction=self.SYSTEM_PROMPT,
            )
        except Exception as e:
            print(f"Warning: Could not configure tool-calling model: {e}")
            self._model_with_tools = None

        self._configured = True

    async def investigate_pollution(
        self,
        alert_id: str,
        station_code: str,
        parameters: Optional[WaterQualityParameters] = None,
        max_turns: int = 10,
    ) -> InvestigationResult:
        """
        Run a full investigation using tool-calling agent loop.

        The agent will:
        1. Analyze water quality data
        2. Classify the pollution type
        3. Search for nearby factories
        4. Check violation history
        5. Calculate recommended fine

        Args:
            alert_id: The alert being investigated
            station_code: Detection station code
            parameters: Optional pre-loaded water quality parameters
            max_turns: Maximum number of tool-calling turns

        Returns:
            InvestigationResult with all findings
        """
        self._configure()

        if not self._model_with_tools:
            # Fallback to rule-based investigation
            return await self._rule_based_investigation(alert_id, station_code, parameters)

        from .agent_tools import execute_tool

        steps: List[InvestigationStep] = []
        step_num = 0

        # Initial prompt
        param_text = self._format_parameters(parameters) if parameters else ""
        water_info = f"Initial water quality readings: {param_text}" if param_text else "Start by getting water quality data from the station."
        
        initial_prompt = f"""
Investigate pollution alert {alert_id} at station {station_code}.

{water_info}

Please investigate this alert step by step using the available tools.
"""

        try:
            chat = self._model_with_tools.start_chat(enable_automatic_function_calling=False)
            response = chat.send_message(initial_prompt)

            # Agent loop
            while step_num < max_turns:
                step_num += 1

                # Check for function calls
                if response.candidates and response.candidates[0].content.parts:
                    for part in response.candidates[0].content.parts:
                        if hasattr(part, 'function_call') and part.function_call:
                            fc = part.function_call
                            tool_name = fc.name
                            tool_args = dict(fc.args) if fc.args else {}

                            # Execute the tool
                            tool_result = execute_tool(tool_name, tool_args)

                            steps.append(InvestigationStep(
                                step_number=step_num,
                                action=f"Called {tool_name}",
                                tool_name=tool_name,
                                tool_args=tool_args,
                                result=tool_result,
                                reasoning="",
                            ))

                            # Send tool result back to model
                            response = chat.send_message(
                                genai.protos.Content(
                                    parts=[genai.protos.Part(
                                        function_response=genai.protos.FunctionResponse(
                                            name=tool_name,
                                            response={"result": tool_result}
                                        )
                                    )]
                                )
                            )
                            break  # Process one function call at a time

                        elif hasattr(part, 'text') and part.text:
                            text = part.text
                            steps.append(InvestigationStep(
                                step_number=step_num,
                                action="Reasoning",
                                tool_name=None,
                                tool_args=None,
                                result=None,
                                reasoning=text,
                            ))

                            if "INVESTIGATION COMPLETE" in text.upper():
                                return self._parse_investigation_result(
                                    alert_id, station_code, steps, text, parameters
                                )
                else:
                    break

            # Parse whatever we have
            final_text = response.text if hasattr(response, 'text') else ""
            return self._parse_investigation_result(alert_id, station_code, steps, final_text, parameters)

        except Exception as e:
            print(f"Investigation error: {e}")
            return await self._rule_based_investigation(alert_id, station_code, parameters)

    def _format_parameters(self, params: WaterQualityParameters) -> str:
        """Format parameters for the prompt."""
        lines = []
        if params.temperature is not None:
            lines.append(f"Temperature: {params.temperature}°C")
        if params.dissolved_oxygen is not None:
            lines.append(f"Dissolved Oxygen: {params.dissolved_oxygen} mg/L")
        if params.ph is not None:
            lines.append(f"pH: {params.ph}")
        if params.conductivity is not None:
            lines.append(f"Conductivity: {params.conductivity} µmho/cm")
        if params.bod is not None:
            lines.append(f"BOD: {params.bod} mg/L")
        if params.nitrate_n is not None:
            lines.append(f"Nitrate-N: {params.nitrate_n} mg/L")
        if params.fecal_coliform is not None:
            lines.append(f"Fecal Coliform: {params.fecal_coliform} MPN/100ml")
        if params.total_coliform is not None:
            lines.append(f"Total Coliform: {params.total_coliform} MPN/100ml")
        return "\n".join(lines)

    def _parse_investigation_result(
        self,
        alert_id: str,
        station_code: str,
        steps: List[InvestigationStep],
        final_text: str,
        parameters: Optional[WaterQualityParameters],
    ) -> InvestigationResult:
        """Parse investigation steps into a result."""
        classification = None
        suspected_factories = []
        recommended_fine = None

        for step in steps:
            if step.tool_name == "classify_pollution_type" and step.result:
                result = step.result
                if "error" not in result:
                    category = POLLUTION_CATEGORIES.get(
                        result.get("category_key", "chemical_industrial"),
                        POLLUTION_CATEGORIES["chemical_industrial"]
                    )
                    classification = ClassificationResult(
                        pollution_type=result.get("pollution_type", "Unknown"),
                        pollution_category=result.get("category_key", "chemical_industrial"),
                        confidence=result.get("confidence", 50),
                        reasoning=f"Key indicators: {', '.join(result.get('key_indicators', []))}",
                        ruled_out=[{"type": r, "reason": ""} for r in result.get("ruled_out", [])],
                        key_indicators=result.get("key_indicators", []),
                        recommended_action="Investigate identified factories",
                        act_section=result.get("applicable_act", category["act_section"]),
                        base_fine=result.get("base_fine", category["base_fine"]),
                    )

            elif step.tool_name == "lookup_factory_permits" and step.result:
                if isinstance(step.result, list):
                    suspected_factories.extend(step.result)

            elif step.tool_name == "calculate_fine_amount" and step.result:
                if "error" not in step.result:
                    recommended_fine = step.result

        if not classification and parameters:
            classification = self._rule_based_classification(parameters)

        return InvestigationResult(
            alert_id=alert_id,
            station_code=station_code,
            steps=steps,
            classification=classification,
            suspected_factories=suspected_factories[:5],
            recommended_fine=recommended_fine,
            summary=final_text or "Investigation complete.",
            confidence=classification.confidence if classification else 50.0,
        )

    async def _rule_based_investigation(
        self,
        alert_id: str,
        station_code: str,
        parameters: Optional[WaterQualityParameters],
    ) -> InvestigationResult:
        """Fallback rule-based investigation."""
        steps = []

        if parameters:
            classification = self._rule_based_classification(parameters)
            steps.append(InvestigationStep(
                step_number=1,
                action="Classified pollution",
                tool_name="classify_pollution_type",
                tool_args=None,
                result={"pollution_type": classification.pollution_type},
                reasoning="Used rule-based classification",
            ))
        else:
            classification = None

        return InvestigationResult(
            alert_id=alert_id,
            station_code=station_code,
            steps=steps,
            classification=classification,
            suspected_factories=[],
            recommended_fine=None,
            summary="Rule-based investigation complete. Gemini API not available for full investigation.",
            confidence=classification.confidence if classification else 50.0,
        )

    async def classify_pollution(
        self,
        parameters: WaterQualityParameters,
        station_code: Optional[str] = None,
        context: Optional[str] = None,
    ) -> ClassificationResult:
        """
        Classify pollution type from water quality parameters using Gemini.

        Args:
            parameters: Water quality measurements
            station_code: Optional station identifier for context
            context: Optional additional context

        Returns:
            ClassificationResult with pollution type, confidence, and reasoning
        """
        self._configure()

        # If no API key, use rule-based fallback
        if not self._model:
            return self._rule_based_classification(parameters)

        # Build the prompt
        prompt = self._build_classification_prompt(parameters, station_code, context)

        try:
            response = self._model.generate_content(prompt)
            return self._parse_classification_response(response.text, parameters)
        except Exception as e:
            print(f"Gemini API error: {e}. Using fallback classification.")
            return self._rule_based_classification(parameters)

    async def generate_fine_content(
        self,
        factory_name: str,
        license_id: str,
        violation_type: str,
        violation_details: str,
        fine_amount: float,
        inspector_name: str,
        station_code: str,
        measurement_date: str,
        parameters: Optional[WaterQualityParameters] = None,
    ) -> dict:
        """
        Generate formal legal content for a fine/violation notice.

        Returns a dict with structured content for PDF generation.
        """
        self._configure()

        if not self._model:
            return self._generate_template_content(
                factory_name, license_id, violation_type, fine_amount
            )

        prompt = f"""
Generate formal legal content for a water pollution violation notice. Use official government language.

VIOLATION DETAILS:
- Violating Entity: {factory_name}
- License Number: {license_id}
- Violation Type: {violation_type}
- Details: {violation_details}
- Fine Amount: Rs. {fine_amount:,.2f}
- Issuing Officer: {inspector_name}
- Detection Station: {station_code}
- Detection Date: {measurement_date}

Generate the following sections in JSON format:
{{
    "notice_reference": "A formal reference number format",
    "legal_header": "Official header text citing relevant acts",
    "violation_statement": "Formal statement of the violation (2-3 sentences)",
    "evidence_summary": "Summary of evidence from water quality monitoring",
    "fine_breakdown": "Breakdown of how the fine was calculated",
    "payment_instructions": "Instructions for paying the fine",
    "deadline": "Payment deadline (30 days from notice)",
    "appeal_process": "Brief description of appeal process",
    "consequences": "Consequences of non-payment",
    "closing_statement": "Formal closing statement"
}}

Use formal legal language appropriate for Indian government documents.
Cite the Water (Prevention and Control of Pollution) Act, 1974 and relevant rules.
"""

        try:
            response = self._model.generate_content(prompt)
            # Try to parse as JSON
            text = response.text
            # Find JSON in response
            start = text.find("{")
            end = text.rfind("}") + 1
            if start >= 0 and end > start:
                return json.loads(text[start:end])
            return self._generate_template_content(
                factory_name, license_id, violation_type, fine_amount
            )
        except Exception as e:
            print(f"Gemini API error: {e}")
            return self._generate_template_content(
                factory_name, license_id, violation_type, fine_amount
            )

    def _build_classification_prompt(
        self,
        parameters: WaterQualityParameters,
        station_code: Optional[str],
        context: Optional[str],
    ) -> str:
        """Build the classification prompt for Gemini."""
        param_lines = []
        if parameters.temperature is not None:
            param_lines.append(f"- Temperature: {parameters.temperature} °C")
        if parameters.dissolved_oxygen is not None:
            param_lines.append(f"- Dissolved Oxygen: {parameters.dissolved_oxygen} mg/L")
        if parameters.ph is not None:
            param_lines.append(f"- pH: {parameters.ph}")
        if parameters.conductivity is not None:
            param_lines.append(f"- Conductivity: {parameters.conductivity} µmho/cm")
        if parameters.bod is not None:
            param_lines.append(f"- BOD: {parameters.bod} mg/L")
        if parameters.nitrate_n is not None:
            param_lines.append(f"- Nitrate-N: {parameters.nitrate_n} mg/L")
        if parameters.fecal_coliform is not None:
            param_lines.append(f"- Fecal Coliform: {parameters.fecal_coliform} MPN/100ml")
        if parameters.total_coliform is not None:
            param_lines.append(f"- Total Coliform: {parameters.total_coliform} MPN/100ml")

        params_text = "\n".join(param_lines)

        categories_text = "\n".join([
            f"{i+1}. {cat['name']} - {', '.join(cat['indicators'])}"
            for i, cat in enumerate(POLLUTION_CATEGORIES.values())
        ])

        prompt = f"""
You are an expert water quality analyst. Analyze these water quality parameters and classify the pollution type.

MEASURED PARAMETERS:
{params_text}

NORMAL THRESHOLDS (CPCB Standards):
- Temperature: < 35°C
- Dissolved Oxygen: > 5 mg/L
- pH: 6.5 - 8.5
- Conductivity: < 1500 µmho/cm
- BOD: < 3 mg/L
- Nitrate-N: < 10 mg/L
- Fecal Coliform: < 500 MPN/100ml
- Total Coliform: < 5000 MPN/100ml

POLLUTION CATEGORIES:
{categories_text}

{f"STATION: {station_code}" if station_code else ""}
{f"ADDITIONAL CONTEXT: {context}" if context else ""}

Analyze the parameters and respond in this exact JSON format:
{{
    "pollution_type": "The specific pollution type name",
    "pollution_category": "The category key (e.g., 'industrial_dye', 'sewage')",
    "confidence": 85.5,
    "reasoning": "Detailed explanation of why this classification was made",
    "key_indicators": ["indicator1", "indicator2"],
    "ruled_out": [
        {{"type": "Other Type", "reason": "Why it was ruled out"}}
    ],
    "recommended_action": "What the inspector should do next"
}}

Provide a confidence score between 0-100. Be specific in your reasoning.
"""
        return prompt

    def _parse_classification_response(
        self, response_text: str, parameters: WaterQualityParameters
    ) -> ClassificationResult:
        """Parse Gemini's classification response."""
        try:
            # Find JSON in response
            start = response_text.find("{")
            end = response_text.rfind("}") + 1
            if start >= 0 and end > start:
                data = json.loads(response_text[start:end])

                # Get category info
                category_key = data.get("pollution_category", "chemical_industrial")
                category = POLLUTION_CATEGORIES.get(
                    category_key,
                    POLLUTION_CATEGORIES["chemical_industrial"]
                )

                return ClassificationResult(
                    pollution_type=data.get("pollution_type", "Unknown"),
                    pollution_category=category_key,
                    confidence=float(data.get("confidence", 50.0)),
                    reasoning=data.get("reasoning", ""),
                    ruled_out=data.get("ruled_out", []),
                    key_indicators=data.get("key_indicators", []),
                    recommended_action=data.get(
                        "recommended_action",
                        "Investigate further and collect samples"
                    ),
                    act_section=category["act_section"],
                    base_fine=category["base_fine"],
                )
        except (json.JSONDecodeError, KeyError) as e:
            print(f"Error parsing Gemini response: {e}")

        # Fallback to rule-based
        return self._rule_based_classification(parameters)

    def _rule_based_classification(
        self, parameters: WaterQualityParameters
    ) -> ClassificationResult:
        """Fallback rule-based classification when Gemini is unavailable."""
        # Determine pollution type based on rules
        pollution_type = "Unknown Pollution"
        category_key = "chemical_industrial"
        key_indicators = []
        ruled_out = []
        confidence = 60.0

        # Check for sewage
        if (parameters.fecal_coliform and parameters.fecal_coliform > 5000) or \
           (parameters.total_coliform and parameters.total_coliform > 10000):
            pollution_type = "Sewage Contamination"
            category_key = "sewage"
            key_indicators = ["high_fecal_coliform", "elevated_bod"]
            confidence = 85.0
            ruled_out = [
                {"type": "Industrial Dye", "reason": "No conductivity spike"},
                {"type": "Thermal", "reason": "Normal temperature range"}
            ]

        # Check for industrial dye
        elif (parameters.conductivity and parameters.conductivity > 2000) and \
             (parameters.ph and (parameters.ph < 5.5 or parameters.ph > 9.0)):
            pollution_type = "Industrial Dye Discharge"
            category_key = "industrial_dye"
            key_indicators = ["high_conductivity", "abnormal_ph"]
            confidence = 80.0
            ruled_out = [
                {"type": "Sewage", "reason": "Low coliform levels"},
                {"type": "Agricultural", "reason": "High conductivity indicates industrial source"}
            ]

        # Check for thermal pollution
        elif parameters.temperature and parameters.temperature > 38:
            pollution_type = "Thermal Pollution"
            category_key = "thermal"
            key_indicators = ["high_temperature", "low_do"]
            confidence = 75.0
            ruled_out = [
                {"type": "Sewage", "reason": "Temperature pattern suggests thermal source"}
            ]

        # Check for organic industrial
        elif parameters.bod and parameters.bod > 30:
            pollution_type = "Organic Industrial Waste"
            category_key = "organic_industrial"
            key_indicators = ["very_high_bod", "low_do"]
            confidence = 70.0

        # Check for agricultural runoff
        elif parameters.nitrate_n and parameters.nitrate_n > 20:
            pollution_type = "Agricultural Runoff"
            category_key = "agricultural_runoff"
            key_indicators = ["high_nitrate"]
            confidence = 65.0

        category = POLLUTION_CATEGORIES.get(
            category_key,
            POLLUTION_CATEGORIES["chemical_industrial"]
        )

        return ClassificationResult(
            pollution_type=pollution_type,
            pollution_category=category_key,
            confidence=confidence,
            reasoning=f"Classification based on parameter analysis. Key factors: {', '.join(key_indicators)}.",
            ruled_out=ruled_out,
            key_indicators=key_indicators,
            recommended_action="Investigate source, collect samples, and verify factory permits in the area.",
            act_section=category["act_section"],
            base_fine=category["base_fine"],
        )

    def _generate_template_content(
        self,
        factory_name: str,
        license_id: str,
        violation_type: str,
        fine_amount: float,
    ) -> dict:
        """Generate template fine content without Gemini."""
        return {
            "notice_reference": f"JALRAKSHAK/FINE/{license_id.split('/')[-1]}",
            "legal_header": "Notice under Section 25 of the Water (Prevention and Control of Pollution) Act, 1974",
            "violation_statement": f"This is to inform that {factory_name} (License: {license_id}) has been found in violation of water pollution control regulations. The violation type has been classified as: {violation_type}.",
            "evidence_summary": "Evidence collected through JalRakshak automated water quality monitoring system shows parameters exceeding permissible limits as prescribed by CPCB standards.",
            "fine_breakdown": f"Base fine for {violation_type}: Rs. {fine_amount:,.2f}",
            "payment_instructions": "Payment to be made via online portal or by demand draft in favor of State Pollution Control Board.",
            "deadline": "30 days from the date of this notice",
            "appeal_process": "Appeal may be filed with the Appellate Authority within 30 days of receiving this notice, as per Section 28 of the Act.",
            "consequences": "Failure to pay may result in additional penalties, prosecution under Section 43-A, and/or closure order under Section 33-A of the Act.",
            "closing_statement": "This notice is issued in the interest of environmental protection and public health."
        }


# Singleton instance
_gemini_agent: Optional[GeminiAgent] = None


def get_gemini_agent() -> GeminiAgent:
    """Get singleton Gemini agent instance."""
    global _gemini_agent
    if _gemini_agent is None:
        _gemini_agent = GeminiAgent()
    return _gemini_agent
