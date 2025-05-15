import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { PdfExportRow } from '../types'; // Make sure PdfExportRow is in types.ts
import { formatInTimeZone } from 'date-fns-tz';
import { isValid } from 'date-fns';

const formatDateForSubtitle = (date: Date, timeZone: string): string => {
  try {
    if (!isValid(date)) {
      return 'Invalid Date';
    }
    // Using a more explicit and commonly supported format string
    return formatInTimeZone(date, timeZone, 'dd MMM yyyy, HH:mm:ss zzz');
  } catch (error) {
    console.error('Error formatting subtitle date:', date, error);
    return 'Invalid Date Format';
  }
};

interface ReportSummary {
  totalIncome: number;
  totalExpenses: number;
  netFlow: number;
}

export const exportToPdf = (
  data: PdfExportRow[],
  fileName: string,
  reportTitle: string,
  timeZone: string,
  summary?: ReportSummary,
  reportType: 'all' | 'expense' | 'income' = 'all'
): void => {
  console.log(`Exporting to PDF (type: ${reportType}) with pre-formatted data:`, data.length);
  if (!data || data.length === 0) {
    console.warn("No data to export to PDF.");
    return;
  }

  try {
    const doc = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a4'
    });
    let startY = 28;

    // ---- Report Title and Subtitle ----
    doc.setFontSize(18);
    doc.setTextColor(40);
    doc.text(reportTitle, 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(100);
    const currentTimeFormatted = formatDateForSubtitle(new Date(), timeZone);
    const subTitle = `Generated on ${currentTimeFormatted}`;
    doc.text(subTitle, 14, startY);
    startY += 10;

    // ---- Conditional Summary Section ----
    if (summary) {
      doc.setFontSize(12);
      doc.setTextColor(40);
      const summaryDataRows: string[][] = [];

      if (reportType === 'income') {
        summaryDataRows.push([`Total Income:`, `${summary.totalIncome.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`]);
      } else if (reportType === 'expense') {
        summaryDataRows.push([`Total Expenses:`, `${summary.totalExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`]);
      } else { // 'all'
        doc.text("Summary for the Period:", 14, startY);
        startY += 6;
        summaryDataRows.push([`Total Income:`, `${summary.totalIncome.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`]);
        summaryDataRows.push([`Total Expenses:`, `${summary.totalExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`]);
        summaryDataRows.push([`Net Flow:`, `${summary.netFlow.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`]);
      }

      if (summaryDataRows.length > 0) {
        autoTable(doc, {
          body: summaryDataRows,
          startY: startY,
          theme: 'plain',
          styles: {
            fontSize: 9,
            cellPadding: { top: 1.5, right: 2, bottom: 1.5, left: 2 },
            valign: 'middle'
          },
          columnStyles: {
            '0': { fontStyle: 'bold', cellWidth: 35, halign: 'left' as const, textColor: [50, 50, 50] },
            '1': { halign: 'right' as const, cellWidth: 45, fontStyle: 'bold' },
          },
          didDrawPage: (hookData) => {
            startY = hookData.cursor?.y ? hookData.cursor.y : startY;
          },
          tableLineColor: [220, 220, 220],
          tableLineWidth: reportType === 'all' ? 0.2 : 0,
        });
        startY = (doc as any).lastAutoTable.finalY + 8;
      } else {
        if (reportType === 'all') startY -= 6;
      }
    } else {
      startY = 38;
    }

    // ---- Main Transaction Table ----
    const tableColumnsBase = ["Date", "Category/Source", "Description", "Amount", "Tags"];
    let currentTableColumns = ["Sl/No", ...tableColumnsBase];
    if (reportType === 'all') {
      currentTableColumns = ["Sl/No", "Type", ...tableColumnsBase];
    }

    const tableRows: string[][] = data.map((row, index) => {
      const baseRowData = [
        row.Date,
        row['Category/Source'],
        row.Description,
        row.Amount,
        row.Tags,
      ];
      if (reportType === 'all') {
        return [(index + 1).toString(), row.Type, ...baseRowData];
      }
      return [(index + 1).toString(), ...baseRowData];
    });

    const typeColumnIndexIfPresent = reportType === 'all' ? 1 : -1;
    const amountColumnIndex = reportType === 'all' ? 5 : 4;

    // Further refined column widths
    const columnStylesAll = {
      '0': { cellWidth: 8, halign: 'center' as const },  // Sl/No.
      '1': { cellWidth: 15, halign: 'left' as const },   // Type
      '2': { cellWidth: 25, halign: 'left' as const },   // Date (dd/MM/yy HH:mm is relatively short)
      '3': { cellWidth: 35, halign: 'left' as const },   // Category/Source
      '4': { cellWidth: 55, halign: 'left' as const },   // Description (main flexible column)
      '5': { cellWidth: 22, halign: 'right' as const },  // Amount
      '6': { cellWidth: 20, halign: 'left' as const }    // Tags
    }; // Total: 8+15+25+35+55+22+20 = 170 mm 

    const columnStylesSpecific = {
      '0': { cellWidth: 8, halign: 'center' as const },  // Sl/No.
      '1': { cellWidth: 25, halign: 'left' as const },   // Date
      '2': { cellWidth: 40, halign: 'left' as const },   // Category/Source
      '3': { cellWidth: 60, halign: 'left' as const },   // Description (main flexible column)
      '4': { cellWidth: 22, halign: 'right' as const },  // Amount
      '5': { cellWidth: 25, halign: 'left' as const }    // Tags
    }; // Total: 8+25+40+60+22+25 = 180 mm

    autoTable(doc, {
      head: [currentTableColumns],
      body: tableRows,
      startY: startY,
      theme: 'grid',
      headStyles: {
        fillColor: [74, 85, 104],
        textColor: [255, 255, 255],
        fontSize: 8.5, // Reduced header font slightly
        fontStyle: 'bold',
        halign: 'center',
        valign: 'middle',
        cellPadding: { top: 2.5, right: 2, bottom: 2.5, left: 2 },
      },
      styles: {
        fontSize: 8,
        cellPadding: { top: 1.8, right: 2, bottom: 1.8, left: 2 }, // Reduced cell padding
        lineColor: [220, 220, 220],
        lineWidth: 0.15,
        valign: 'middle',
        overflow: 'linebreak'
      },
      columnStyles: reportType === 'all' ? columnStylesAll : columnStylesSpecific,
      alternateRowStyles: {
        fillColor: [245, 249, 250]
      },
      willDrawCell: function (hookData) {
        if (typeColumnIndexIfPresent !== -1 && hookData.section === 'body' && hookData.column.index === typeColumnIndexIfPresent) {
          const type = hookData.cell.text[0];
          if (type === 'Income') {
            hookData.cell.styles.textColor = [34, 139, 34];
            hookData.cell.styles.fontStyle = 'bold';
          } else if (type === 'Expense') {
            hookData.cell.styles.textColor = [205, 92, 92];
            hookData.cell.styles.fontStyle = 'bold';
          }
        }
        if (hookData.section === 'body' && hookData.column.index === amountColumnIndex) {
          const originalRowData = data[hookData.row.index];
          if (originalRowData.Type === 'Income') {
            hookData.cell.styles.textColor = [34, 139, 34];
            hookData.cell.styles.fontStyle = 'bold';
          } else if (originalRowData.Type === 'Expense') {
            hookData.cell.styles.textColor = [205, 92, 92];
            hookData.cell.styles.fontStyle = 'bold';
          }
        }
      }
    });

    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `Page ${i} of ${pageCount}`,
        doc.internal.pageSize.getWidth() - 20,
        doc.internal.pageSize.getHeight() - 10
      );
    }

    doc.save(fileName);
    console.log("PDF generation successful, save prompted:", fileName);
  } catch (error) {
    console.error("Error generating PDF:", error);
    alert("Error generating PDF. Please check the console for details.");
  }
};