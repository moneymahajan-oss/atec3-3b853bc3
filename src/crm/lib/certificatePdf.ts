import jsPDF from "jspdf";

export interface CertificateData {
  certificateNo: string;
  studentName: string;
  enrolmentNo?: string | null;
  courseName: string;
  grade?: string | null;
  issuedOn: string; // YYYY-MM-DD
  templateKind?: string;
  institute: {
    name: string;
    address?: string | null;
    website?: string | null;
    logoUrl?: string | null;
    sealUrl?: string | null;
    signatureUrl?: string | null;
  };
}

async function fetchAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function generateCertificatePdf(data: CertificateData): Promise<Blob> {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  // Outer border
  doc.setDrawColor(180, 140, 60);
  doc.setLineWidth(6);
  doc.rect(20, 20, pageW - 40, pageH - 40);
  doc.setLineWidth(1);
  doc.rect(32, 32, pageW - 64, pageH - 64);

  // Logo
  if (data.institute.logoUrl) {
    const logo = await fetchAsDataUrl(data.institute.logoUrl);
    if (logo) {
      try { doc.addImage(logo, "PNG", pageW / 2 - 35, 50, 70, 70); } catch {}
    }
  }

  // Institute name
  doc.setFont("times", "bold");
  doc.setFontSize(26);
  doc.setTextColor(30, 30, 60);
  doc.text(data.institute.name, pageW / 2, 145, { align: "center" });

  if (data.institute.address) {
    doc.setFont("times", "normal");
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text(data.institute.address, pageW / 2, 162, { align: "center" });
  }

  // Title
  doc.setFont("times", "bold");
  doc.setFontSize(36);
  doc.setTextColor(180, 140, 60);
  doc.text("Certificate of Completion", pageW / 2, 215, { align: "center" });

  // Body
  doc.setFont("times", "italic");
  doc.setFontSize(14);
  doc.setTextColor(60, 60, 60);
  doc.text("This is to certify that", pageW / 2, 255, { align: "center" });

  doc.setFont("times", "bold");
  doc.setFontSize(28);
  doc.setTextColor(30, 30, 60);
  doc.text(data.studentName, pageW / 2, 295, { align: "center" });

  doc.setFont("times", "italic");
  doc.setFontSize(13);
  doc.setTextColor(60, 60, 60);
  doc.text(
    `has successfully completed the course`,
    pageW / 2, 325, { align: "center" }
  );

  doc.setFont("times", "bold");
  doc.setFontSize(20);
  doc.setTextColor(30, 30, 60);
  doc.text(data.courseName, pageW / 2, 355, { align: "center" });

  if (data.grade) {
    doc.setFont("times", "normal");
    doc.setFontSize(13);
    doc.setTextColor(60, 60, 60);
    doc.text(`with grade ${data.grade}`, pageW / 2, 380, { align: "center" });
  }

  // Footer row
  const footerY = pageH - 110;
  doc.setFont("times", "normal");
  doc.setFontSize(11);
  doc.setTextColor(40, 40, 40);

  // Left: certificate no & date
  doc.text(`Certificate No: ${data.certificateNo}`, 70, footerY);
  doc.text(`Date of Issue: ${data.issuedOn}`, 70, footerY + 18);
  if (data.enrolmentNo) doc.text(`Enrolment No: ${data.enrolmentNo}`, 70, footerY + 36);

  // Right: signature
  if (data.institute.signatureUrl) {
    const sig = await fetchAsDataUrl(data.institute.signatureUrl);
    if (sig) {
      try { doc.addImage(sig, "PNG", pageW - 200, footerY - 35, 110, 40); } catch {}
    }
  }
  doc.line(pageW - 210, footerY + 10, pageW - 80, footerY + 10);
  doc.text("Director Signature", pageW - 145, footerY + 28, { align: "center" });

  // Center: seal
  if (data.institute.sealUrl) {
    const seal = await fetchAsDataUrl(data.institute.sealUrl);
    if (seal) {
      try { doc.addImage(seal, "PNG", pageW / 2 - 40, footerY - 30, 80, 80); } catch {}
    }
  }

  // Verify URL
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  const verifyUrl = `${data.institute.website || ""}/verify/${data.certificateNo}`.replace(/^\/+/, "");
  doc.text(`Verify: ${verifyUrl}`, pageW / 2, pageH - 40, { align: "center" });

  return doc.output("blob");
}
