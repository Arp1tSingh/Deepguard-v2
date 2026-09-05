"""
Builds the "Export Report" PDF: verdict, per-model signals, and timeline data,
matching what the Export section promises ("PDF with verdict, signals, and
timeline data").
"""
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle


def build_pdf_report(video_id, result, out_path):
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("TitleX", parent=styles["Title"], textColor=colors.HexColor("#222"))
    h2 = styles["Heading2"]
    body = styles["BodyText"]

    doc = SimpleDocTemplate(out_path, pagesize=letter,
                             topMargin=0.6 * inch, bottomMargin=0.6 * inch)
    elements = []

    elements.append(Paragraph("DeepGuard Forensic Analysis Report", title_style))
    elements.append(Paragraph(f"Video ID: {video_id}", body))
    elements.append(Spacer(1, 0.25 * inch))

    v = result["verdict"]
    elements.append(Paragraph("Verdict", h2))
    verdict_text = (f"<b>{v['label'].upper()}</b> — aggregate confidence {v['confidence']}% "
                    f"(model agreement: {v['agreement']})")
    elements.append(Paragraph(verdict_text, body))
    elements.append(Spacer(1, 0.15 * inch))

    model_rows = [["Model", "Score (P fake)", "Note"]]
    for m in v["models"]:
        model_rows.append([m["name"], f"{m['score']}%", m["note"]])
    table = Table(model_rows, colWidths=[1.2 * inch, 1.2 * inch, 3.8 * inch])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#333")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    elements.append(table)
    elements.append(Spacer(1, 0.3 * inch))

    elements.append(Paragraph("Timeline (per-frame scores)", h2))
    tl_rows = [["Timestamp", "Xception", "SPSL", "UCF"]]
    for pt in result["timeline"]:
        tl_rows.append([pt["timestamp"], f"{pt['xception']}%", f"{pt['spsl']}%", f"{pt['ucf']}%"])
    tl_table = Table(tl_rows, colWidths=[1.3 * inch, 1.3 * inch, 1.3 * inch, 1.3 * inch])
    tl_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#333")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
    ]))
    elements.append(tl_table)
    elements.append(Spacer(1, 0.3 * inch))

    elements.append(Paragraph("Caveats", h2))
    caveat_text = (
        "This tool combines three independently-verified open-source detectors "
        "(UCF, SPSL, Xception from DeepfakeBench). Accuracy was measured on a "
        "small 20-clip labeled sample and should not be treated as a guarantee "
        "on unseen content. Grad-CAM highlights are Xception-specific and show "
        "where that model's attention concentrated, not proof of manipulation "
        "on their own."
    )
    elements.append(Paragraph(caveat_text, body))

    doc.build(elements)
    return out_path
