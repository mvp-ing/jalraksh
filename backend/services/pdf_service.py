"""PDF generation service for fine/violation documents."""

import os
from datetime import datetime
from io import BytesIO
from pathlib import Path
from typing import Optional

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    HRFlowable,
)
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY

from ..config import get_settings
from ..models.schemas import WaterQualityParameters


class PDFService:
    """Service for generating fine/violation PDF documents."""

    def __init__(self):
        settings = get_settings()
        self.output_dir = Path(settings.fines_output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def generate_fine_pdf(
        self,
        fine_id: str,
        factory_name: str,
        license_id: str,
        industry_type: str,
        location: str,
        violation_type: str,
        fine_amount: float,
        inspector_name: str,
        inspector_designation: str,
        station_code: str,
        station_name: str,
        measurement_date: str,
        parameters: Optional[WaterQualityParameters] = None,
        generated_content: Optional[dict] = None,
        permit_status: str = "EXPIRED",
    ) -> str:
        """
        Generate a PDF fine/violation notice document.

        Returns the file path of the generated PDF.
        """
        # Create PDF buffer
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=2 * cm,
            leftMargin=2 * cm,
            topMargin=2 * cm,
            bottomMargin=2 * cm,
        )

        # Get styles
        styles = getSampleStyleSheet()
        styles.add(ParagraphStyle(
            name='Header',
            parent=styles['Heading1'],
            fontSize=14,
            alignment=TA_CENTER,
            spaceAfter=6,
        ))
        styles.add(ParagraphStyle(
            name='SubHeader',
            parent=styles['Heading2'],
            fontSize=11,
            alignment=TA_CENTER,
            spaceAfter=12,
        ))
        styles.add(ParagraphStyle(
            name='Body',
            parent=styles['Normal'],
            fontSize=10,
            alignment=TA_JUSTIFY,
            spaceAfter=6,
        ))
        styles.add(ParagraphStyle(
            name='Small',
            parent=styles['Normal'],
            fontSize=8,
            alignment=TA_CENTER,
        ))

        # Build document content
        content = []

        # Header
        content.append(Paragraph("STATE POLLUTION CONTROL BOARD", styles['Header']))
        content.append(Paragraph("JalRakshak Water Quality Monitoring System", styles['SubHeader']))
        content.append(Paragraph("Automated Violation Detection & Enforcement", styles['Small']))
        content.append(Spacer(1, 0.5 * cm))
        content.append(HRFlowable(width="100%", thickness=2, color=colors.black))
        content.append(Spacer(1, 0.5 * cm))

        # Notice details
        notice_date = datetime.now().strftime("%d/%m/%Y")
        ref_number = generated_content.get("notice_reference", f"JALRAKSHAK/FINE/{fine_id}") if generated_content else f"JALRAKSHAK/FINE/{fine_id}"

        notice_info = f"""
        <b>NOTICE NO:</b> {ref_number}<br/>
        <b>DATE:</b> {notice_date}
        """
        content.append(Paragraph(notice_info, styles['Body']))
        content.append(Spacer(1, 0.5 * cm))

        # Title
        content.append(Paragraph(
            "<b>POLLUTION VIOLATION NOTICE</b>",
            ParagraphStyle(
                name='Title',
                parent=styles['Heading1'],
                fontSize=14,
                alignment=TA_CENTER,
                textColor=colors.red,
            )
        ))

        legal_header = generated_content.get(
            "legal_header",
            "Under Section 25 of the Water (Prevention and Control of Pollution) Act, 1974"
        ) if generated_content else "Under Section 25 of the Water (Prevention and Control of Pollution) Act, 1974"

        content.append(Paragraph(legal_header, styles['Small']))
        content.append(Spacer(1, 0.5 * cm))

        # Violator details
        content.append(Paragraph("<b>TO:</b>", styles['Body']))
        violator_info = f"""
        {factory_name}<br/>
        License No: {license_id}<br/>
        Industry Type: {industry_type}<br/>
        Location: {location}
        """
        content.append(Paragraph(violator_info, styles['Body']))
        content.append(Spacer(1, 0.3 * cm))

        # Violation statement
        violation_stmt = generated_content.get(
            "violation_statement",
            f"This is to inform that your establishment has been found in violation of water pollution control regulations. The violation has been classified as: <b>{violation_type}</b>."
        ) if generated_content else f"This is to inform that your establishment has been found in violation of water pollution control regulations. The violation has been classified as: <b>{violation_type}</b>."

        content.append(Paragraph("<b>VIOLATION STATEMENT:</b>", styles['Body']))
        content.append(Paragraph(violation_stmt, styles['Body']))
        content.append(Spacer(1, 0.3 * cm))

        # Detection details table
        content.append(Paragraph("<b>DETECTION DETAILS:</b>", styles['Body']))
        detection_data = [
            ["Detection Station:", f"{station_code} - {station_name}"],
            ["Detection Date:", measurement_date],
            ["Pollution Type:", violation_type],
            ["Permit Status:", permit_status],
        ]
        detection_table = Table(detection_data, colWidths=[5 * cm, 10 * cm])
        detection_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
        ]))
        content.append(detection_table)
        content.append(Spacer(1, 0.3 * cm))

        # Water quality parameters table (if provided)
        if parameters:
            content.append(Paragraph("<b>WATER QUALITY PARAMETERS:</b>", styles['Body']))
            param_data = [["Parameter", "Measured Value", "Normal Limit"]]

            if parameters.temperature is not None:
                param_data.append(["Temperature", f"{parameters.temperature} °C", "< 35 °C"])
            if parameters.dissolved_oxygen is not None:
                param_data.append(["Dissolved Oxygen", f"{parameters.dissolved_oxygen} mg/L", "> 5 mg/L"])
            if parameters.ph is not None:
                param_data.append(["pH", f"{parameters.ph}", "6.5 - 8.5"])
            if parameters.conductivity is not None:
                param_data.append(["Conductivity", f"{parameters.conductivity} µmho/cm", "< 1500 µmho/cm"])
            if parameters.bod is not None:
                param_data.append(["BOD", f"{parameters.bod} mg/L", "< 3 mg/L"])
            if parameters.fecal_coliform is not None:
                param_data.append(["Fecal Coliform", f"{parameters.fecal_coliform} MPN/100ml", "< 500 MPN/100ml"])

            if len(param_data) > 1:
                param_table = Table(param_data, colWidths=[5 * cm, 5 * cm, 5 * cm])
                param_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                    ('FONTSIZE', (0, 0), (-1, -1), 9),
                    ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
                    ('TOPPADDING', (0, 0), (-1, -1), 4),
                ]))
                content.append(param_table)
                content.append(Spacer(1, 0.3 * cm))

        # Fine amount
        content.append(HRFlowable(width="100%", thickness=1, color=colors.grey))
        content.append(Spacer(1, 0.2 * cm))
        fine_text = f"<b>PENALTY AMOUNT: Rs. {fine_amount:,.2f}/-</b>"
        content.append(Paragraph(
            fine_text,
            ParagraphStyle(
                name='Fine',
                parent=styles['Heading2'],
                fontSize=14,
                alignment=TA_CENTER,
                textColor=colors.red,
            )
        ))
        content.append(Spacer(1, 0.2 * cm))
        content.append(HRFlowable(width="100%", thickness=1, color=colors.grey))
        content.append(Spacer(1, 0.3 * cm))

        # Payment instructions
        payment = generated_content.get(
            "payment_instructions",
            "Payment to be made via online portal or by demand draft in favor of State Pollution Control Board."
        ) if generated_content else "Payment to be made via online portal or by demand draft in favor of State Pollution Control Board."

        deadline = generated_content.get(
            "deadline",
            "30 days from the date of this notice"
        ) if generated_content else "30 days from the date of this notice"

        content.append(Paragraph("<b>PAYMENT INSTRUCTIONS:</b>", styles['Body']))
        content.append(Paragraph(payment, styles['Body']))
        content.append(Paragraph(f"<b>Payment Deadline:</b> {deadline}", styles['Body']))
        content.append(Spacer(1, 0.3 * cm))

        # Consequences
        consequences = generated_content.get(
            "consequences",
            "Failure to pay may result in additional penalties, prosecution under Section 43-A, and/or closure order under Section 33-A of the Water Act."
        ) if generated_content else "Failure to pay may result in additional penalties, prosecution under Section 43-A, and/or closure order under Section 33-A of the Water Act."

        content.append(Paragraph("<b>CONSEQUENCES OF NON-COMPLIANCE:</b>", styles['Body']))
        content.append(Paragraph(consequences, styles['Body']))
        content.append(Spacer(1, 0.3 * cm))

        # Appeal process
        appeal = generated_content.get(
            "appeal_process",
            "Appeal may be filed with the Appellate Authority within 30 days of receiving this notice, as per Section 28 of the Act."
        ) if generated_content else "Appeal may be filed with the Appellate Authority within 30 days of receiving this notice, as per Section 28 of the Act."

        content.append(Paragraph("<b>APPEAL PROCESS:</b>", styles['Body']))
        content.append(Paragraph(appeal, styles['Body']))
        content.append(Spacer(1, 0.5 * cm))

        # Signature
        content.append(Spacer(1, 1 * cm))
        signature_info = f"""
        <b>Issuing Authority:</b><br/>
        {inspector_name}<br/>
        {inspector_designation}<br/>
        State Pollution Control Board
        """
        content.append(Paragraph(signature_info, styles['Body']))
        content.append(Spacer(1, 0.5 * cm))

        # Footer
        content.append(HRFlowable(width="100%", thickness=1, color=colors.grey))
        footer_text = "This is a computer-generated document from JalRakshak Automated Monitoring System. Digital signature verified."
        content.append(Paragraph(footer_text, styles['Small']))

        # Build PDF
        doc.build(content)

        # Save to file
        pdf_path = self.output_dir / f"fine_{fine_id}.pdf"
        with open(pdf_path, 'wb') as f:
            f.write(buffer.getvalue())

        return str(pdf_path)

    def get_pdf_url(self, fine_id: str) -> str:
        """Get the URL/path for a generated fine PDF."""
        return f"/api/fine/{fine_id}/download"


# Singleton instance
_pdf_service: Optional[PDFService] = None


def get_pdf_service() -> PDFService:
    """Get singleton PDF service instance."""
    global _pdf_service
    if _pdf_service is None:
        _pdf_service = PDFService()
    return _pdf_service
