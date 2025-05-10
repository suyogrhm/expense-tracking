import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Expense, Income } from '../types'; // Ensure Tag is imported if used in formatting
// Ensure Tag is imported if used in formatting
import { formatInTimeZone } from 'date-fns-tz';


function isExpense(item: Expense | Income): item is Expense {
  return (item as Expense).category !== undefined;
}

export const exportToPdf = (
  data: (Expense | Income)[],
  fileName: string,
  reportTitle: string,
  timeZone: string
): void => {
  console.log("Exporting to PDF with data:", data);
  if (!data || data.length === 0) {
    console.warn("No data to export to PDF.");
    return;
  }

  try {
    const doc = new jsPDF();
    let tableColumn: string[];
    const tableRows: (string | number)[][] = [];

    const isExpenseData = data.length > 0 && isExpense(data[0]);

    if (isExpenseData) {
      tableColumn = ["Date", "Category", "Sub-Cat", "Amount", "Description", "Tags", "Split Details"];
      (data as Expense[]).forEach(exp => {
        const tagsString = exp.tags?.map(t => t.name).join(', ') || 'N/A';
        let splitDetailsString = 'No';
        if (exp.is_split && exp.expense_split_details && exp.expense_split_details.length > 0) {
          splitDetailsString = exp.expense_split_details
            .map(detail => `${detail.person_name}: ${detail.amount.toLocaleString('en-IN')}`)
            .join('\n'); // Newline for PDF multi-line cell
          if (exp.split_note) {
            splitDetailsString += `\nNote: ${exp.split_note}`;
          }
        } else if (exp.is_split) {
          splitDetailsString = 'Yes (details not specified)';
          if (exp.split_note) {
            splitDetailsString += `\nNote: ${exp.split_note}`;
          }
        }

        tableRows.push([
          formatInTimeZone(new Date(exp.expense_date), timeZone, 'dd MMM yy, hh:mm a'),
          exp.category,
          exp.sub_category || 'N/A',
          exp.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
          exp.description || 'N/A',
          tagsString,
          splitDetailsString,
        ]);
      });
    } else { // Assuming Income data
      tableColumn = ["Date", "Source", "Amount", "Description", "Tags"];
      (data as Income[]).forEach(inc => {
        const tagsString = inc.tags?.map(t => t.name).join(', ') || 'N/A';
        tableRows.push([
          formatInTimeZone(new Date(inc.income_date), timeZone, 'dd MMM yy, hh:mm a'),
          inc.source,
          inc.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
          inc.description || 'N/A',
          tagsString,
        ]);
      });
    }


    doc.setFontSize(18);
    doc.text(reportTitle, 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 30,
      theme: 'grid',
      headStyles: { fillColor: [22, 160, 133] }, // Teal-like color for header
      styles: {
        fontSize: 8, // Reduced font size for more data
        cellPadding: 1.5,
        overflow: 'linebreak' // Allow text to wrap within cells
      },
      columnStyles: {
        2: { halign: isExpenseData ? 'right' : 'left' }, // Amount column for expenses
        3: { halign: isExpenseData ? 'left' : 'right' }, // Description for expenses, Amount for income
        // Adjust column widths if necessary, e.g., make description wider
        // 4: { cellWidth: 'wrap' }, // For description in expenses
      }
    });

    doc.save(fileName);
    console.log("PDF generation successful, save prompted:", fileName);
  } catch (error) {
    console.error("Error generating PDF:", error);
    alert("Error generating PDF. Please check the console for details.");
  }
};