import PDFDocument from "pdfkit";
import { Response } from "express";

// Brand colours
const BRAND_NAVY  = "#07080b";
const BRAND_GOLD  = "#d7b735";
const SLATE_600   = "#475569";
const SLATE_300   = "#cbd5e1";
const SLATE_100   = "#f1f5f9";
const WHITE       = "#ffffff";
const BLACK       = "#0f172a";

export class PdfBuilder {
  doc: InstanceType<typeof PDFDocument>;
  private readonly pageWidth: number;
  private readonly margin: number;
  private readonly contentWidth: number;

  constructor() {
    this.doc = new PDFDocument({
      size: "A4",
      margin: 0,
      bufferPages: true,
      info: { Creator: "Orthodontics Department - Faculty of Dentistry - Benghazi", Producer: "Orthodontics Department - Faculty of Dentistry - Benghazi PDF Engine" },
    });
    this.margin = 48;
    this.pageWidth = this.doc.page.width;
    this.contentWidth = this.pageWidth - this.margin * 2;
  }

  /** Pipe the PDF stream to an Express response */
  pipeToResponse(res: Response, filename: string) {
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
    this.doc.pipe(res);
  }

  /** Full-width gradient header bar */
  header(clinicName: string, reportTitle: string, subtitle?: string) {
    const doc = this.doc;
    // Background
    doc.rect(0, 0, this.pageWidth, 100).fill(BRAND_NAVY);
    // Accent stripe
    doc.rect(0, 95, this.pageWidth, 5).fill(BRAND_GOLD);

    doc.fillColor(WHITE)
      .font("Helvetica-Bold").fontSize(20)
      .text("Orthodontics Department - Faculty of Dentistry - Benghazi", this.margin, 22);

    doc.fillColor("#a0aec0")
      .font("Helvetica").fontSize(9)
      .text(clinicName, this.margin, 46);

    doc.fillColor(WHITE)
      .font("Helvetica-Bold").fontSize(14)
      .text(reportTitle, this.pageWidth - this.margin - 250, 22, { width: 250, align: "right" });

    if (subtitle) {
      doc.fillColor("#a0aec0").font("Helvetica").fontSize(9)
        .text(subtitle, this.pageWidth - this.margin - 250, 46, { width: 250, align: "right" });
    }

    // Reset cursor below header
    doc.y = 116;
  }

  /** Coloured section heading with ruled line */
  sectionHeading(title: string) {
    const doc = this.doc;
    this.ensureSpace(36);
    doc.moveDown(0.4);
    doc.rect(this.margin, doc.y, this.contentWidth, 22).fill(SLATE_100);
    doc.fillColor(BRAND_NAVY).font("Helvetica-Bold").fontSize(10)
      .text(title.toUpperCase(), this.margin + 8, doc.y - 17);
    doc.y += 8;
    doc.fillColor(BLACK).font("Helvetica").fontSize(10);
  }

  /** Two-column key-value row */
  row(label: string, value: string | null | undefined, opts?: { last?: boolean }) {
    const doc = this.doc;
    this.ensureSpace(20);
    const y = doc.y;
    const labelWidth = 175;
    const valueX = this.margin + labelWidth + 8;
    const valueWidth = this.contentWidth - labelWidth - 8;

    doc.fillColor(SLATE_600).font("Helvetica").fontSize(9)
      .text(label, this.margin, y, { width: labelWidth });

    doc.fillColor(BLACK).font("Helvetica").fontSize(9)
      .text(value || "—", valueX, y, { width: valueWidth });

    const newY = Math.max(doc.y, y + 14);
    doc.y = newY;

    if (!opts?.last) {
      doc.moveTo(this.margin, doc.y).lineTo(this.margin + this.contentWidth, doc.y)
        .strokeColor(SLATE_300).lineWidth(0.5).stroke();
      doc.y += 2;
    }
  }

  /** Multi-value tags (conditions, allergies, etc.) */
  tagRow(label: string, values: string[]) {
    const doc = this.doc;
    this.ensureSpace(24);
    const y = doc.y;
    const labelWidth = 175;
    const valueX = this.margin + labelWidth + 8;
    const valueWidth = this.contentWidth - labelWidth - 8;

    doc.fillColor(SLATE_600).font("Helvetica").fontSize(9)
      .text(label, this.margin, y, { width: labelWidth });

    if (values.length === 0) {
      doc.fillColor(SLATE_600).font("Helvetica").fontSize(9)
        .text("—", valueX, y, { width: valueWidth });
    } else {
      doc.fillColor(BLACK).font("Helvetica").fontSize(9)
        .text(values.join(" · "), valueX, y, { width: valueWidth });
    }

    doc.y = Math.max(doc.y, y + 14) + 2;
    doc.moveTo(this.margin, doc.y).lineTo(this.margin + this.contentWidth, doc.y)
      .strokeColor(SLATE_300).lineWidth(0.5).stroke();
    doc.y += 2;
  }

  /** Full-width text block (for notes, objectives, etc.) */
  textBlock(label: string, text: string | null | undefined) {
    const doc = this.doc;
    this.ensureSpace(30);
    doc.fillColor(SLATE_600).font("Helvetica-Bold").fontSize(9)
      .text(label + ":", this.margin, doc.y);
    doc.moveDown(0.2);
    doc.fillColor(BLACK).font("Helvetica").fontSize(9)
      .text(text || "—", this.margin, doc.y, { width: this.contentWidth });
    doc.moveDown(0.5);
  }

  /** Page footer with page numbers and generation timestamp */
  footer() {
    const doc = this.doc;
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      const pageBottom = doc.page.height - 32;

      doc.moveTo(this.margin, pageBottom)
        .lineTo(this.pageWidth - this.margin, pageBottom)
        .strokeColor(SLATE_300).lineWidth(0.5).stroke();

      doc.fillColor(SLATE_600).font("Helvetica").fontSize(8)
        .text(
          `Generated by Orthodontics Department - Faculty of Dentistry - Benghazi · ${new Date().toLocaleString()}`,
          this.margin, pageBottom + 8,
          { width: this.contentWidth / 2 }
        )
        .text(
          `Page ${i - range.start + 1} of ${range.count}`,
          this.pageWidth / 2, pageBottom + 8,
          { width: this.contentWidth / 2, align: "right" }
        );
    }
  }

  /** Add a new page with the same header */
  newPage(clinicName: string, reportTitle: string) {
    this.doc.addPage();
    this.header(clinicName, reportTitle);
  }

  /** Ensure there is at least `needed` px before a page break */
  private ensureSpace(needed: number) {
    const doc = this.doc;
    if (doc.y + needed > doc.page.height - 60) {
      doc.addPage();
      doc.y = 116; // below header
    }
  }

  end() { this.doc.end(); }
}
