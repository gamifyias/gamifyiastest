import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { jsPDF } from 'jspdf';
import { Download, Award } from 'lucide-react';
import { format } from 'date-fns';

interface CertificateGeneratorProps {
  studentName: string;
  testTitle: string;
  score: number;
  totalMarks: number;
  percentage: number;
  completedDate: string;
  certificateNumber: string;
}

export function CertificateGenerator({
  studentName,
  testTitle,
  score,
  totalMarks,
  percentage,
  completedDate,
  certificateNumber,
}: CertificateGeneratorProps) {
  const generatePDF = () => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Background gradient effect with border
    doc.setFillColor(250, 250, 252);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // Decorative border
    doc.setDrawColor(79, 70, 229); // Indigo
    doc.setLineWidth(3);
    doc.rect(10, 10, pageWidth - 20, pageHeight - 20);

    doc.setLineWidth(1);
    doc.rect(15, 15, pageWidth - 30, pageHeight - 30);

    // Corner decorations
    const cornerSize = 20;
    doc.setFillColor(79, 70, 229);
    
    // Top left
    doc.triangle(10, 10, 10 + cornerSize, 10, 10, 10 + cornerSize, 'F');
    // Top right
    doc.triangle(pageWidth - 10, 10, pageWidth - 10 - cornerSize, 10, pageWidth - 10, 10 + cornerSize, 'F');
    // Bottom left
    doc.triangle(10, pageHeight - 10, 10 + cornerSize, pageHeight - 10, 10, pageHeight - 10 - cornerSize, 'F');
    // Bottom right
    doc.triangle(pageWidth - 10, pageHeight - 10, pageWidth - 10 - cornerSize, pageHeight - 10, pageWidth - 10, pageHeight - 10 - cornerSize, 'F');

    // Award icon placeholder (circle)
    doc.setFillColor(79, 70, 229);
    doc.circle(pageWidth / 2, 40, 12, 'F');
    doc.setFillColor(255, 255, 255);
    doc.circle(pageWidth / 2, 40, 8, 'F');
    doc.setFillColor(250, 204, 21); // Gold
    doc.circle(pageWidth / 2, 40, 5, 'F');

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(36);
    doc.setTextColor(79, 70, 229);
    doc.text('CERTIFICATE', pageWidth / 2, 65, { align: 'center' });

    doc.setFontSize(18);
    doc.setTextColor(100, 100, 100);
    doc.text('OF ACHIEVEMENT', pageWidth / 2, 75, { align: 'center' });

    // Subtitle
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.setTextColor(120, 120, 120);
    doc.text('This is to certify that', pageWidth / 2, 95, { align: 'center' });

    // Student Name
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(28);
    doc.setTextColor(30, 30, 30);
    doc.text(studentName, pageWidth / 2, 112, { align: 'center' });

    // Decorative line under name
    doc.setDrawColor(79, 70, 229);
    doc.setLineWidth(0.5);
    const nameWidth = doc.getTextWidth(studentName);
    doc.line((pageWidth - nameWidth) / 2 - 10, 117, (pageWidth + nameWidth) / 2 + 10, 117);

    // Achievement text
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text('has successfully completed and passed', pageWidth / 2, 130, { align: 'center' });

    // Test Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(79, 70, 229);
    doc.text(testTitle, pageWidth / 2, 145, { align: 'center' });

    // Score details
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(14);
    doc.setTextColor(80, 80, 80);
    doc.text(`with a score of ${score}/${totalMarks} (${Math.round(percentage)}%)`, pageWidth / 2, 160, { align: 'center' });

    // Date and Certificate Number
    doc.setFontSize(10);
    doc.setTextColor(120, 120, 120);
    const dateStr = format(new Date(completedDate), 'MMMM d, yyyy');
    doc.text(`Date: ${dateStr}`, 50, pageHeight - 35);
    doc.text(`Certificate No: ${certificateNumber}`, pageWidth - 50, pageHeight - 35, { align: 'right' });

    // Footer
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(30, pageHeight - 45, pageWidth - 30, pageHeight - 45);

    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('This certificate is auto-generated and digitally verified.', pageWidth / 2, pageHeight - 25, { align: 'center' });

    // Save
    doc.save(`Certificate_${studentName.replace(/\s+/g, '_')}_${testTitle.replace(/\s+/g, '_')}.pdf`);
  };

  return (
    <Button onClick={generatePDF} variant="outline" className="gap-2">
      <Download className="w-4 h-4" />
      Download Certificate
    </Button>
  );
}

// Preview component for displaying certificate info
export function CertificatePreview({
  studentName,
  testTitle,
  score,
  totalMarks,
  percentage,
  completedDate,
  certificateNumber,
}: CertificateGeneratorProps) {
  return (
    <div className="border-4 border-primary/20 rounded-lg p-8 bg-gradient-to-br from-background to-muted relative overflow-hidden">
      {/* Decorative corners */}
      <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary" />
      <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary" />
      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary" />
      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary" />

      <div className="text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
          <Award className="w-8 h-8 text-primary" />
        </div>
        
        <div>
          <h3 className="text-2xl font-bold text-primary">CERTIFICATE</h3>
          <p className="text-sm text-muted-foreground">of Achievement</p>
        </div>

        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">This is to certify that</p>
          <h4 className="text-xl font-bold">{studentName}</h4>
          <div className="h-px w-32 mx-auto bg-primary/30" />
        </div>

        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">has successfully completed</p>
          <p className="font-semibold text-primary">{testTitle}</p>
          <p className="text-sm">
            with a score of <span className="font-bold">{score}/{totalMarks}</span> ({Math.round(percentage)}%)
          </p>
        </div>

        <div className="flex justify-between text-xs text-muted-foreground pt-4 border-t">
          <span>Date: {format(new Date(completedDate), 'MMM d, yyyy')}</span>
          <span>Cert No: {certificateNumber}</span>
        </div>
      </div>
    </div>
  );
}