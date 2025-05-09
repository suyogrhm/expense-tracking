import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable'; 
import type { Expense, Income } from '../types'; // Added Income type
 // Added Income type
import { formatInTimeZone } from 'date-fns-tz';


// Type guard to check if an item is an Expense
function isExpense(item: Expense | Income): item is Expense {
  return (item as Expense).category !== undefined;
}

export const exportToPdf = (
    data: (Expense | Income)[], // Can be Expense[] or Income[]
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

    // Determine columns and map data based on type
    if (data.length > 0 && isExpense(data[0])) {
        tableColumn = ["Date", "Category", "Sub-Category", "Amount (₹)", "Description"];
        (data as Expense[]).forEach(exp => {
            tableRows.push([
            formatInTimeZone(new Date(exp.expense_date), timeZone, 'dd MMM yy, hh:mm a'),
            exp.category,
            exp.sub_category || 'N/A',
            exp.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            exp.description || 'N/A',
            ]);
        });
    } else if (data.length > 0 && !isExpense(data[0])) { // Assuming it's Income
        tableColumn = ["Date", "Source", "Amount (₹)", "Description"];
        (data as Income[]).forEach(inc => {
            tableRows.push([
            formatInTimeZone(new Date(inc.income_date), timeZone, 'dd MMM yy, hh:mm a'),
            inc.source,
            inc.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            inc.description || 'N/A',
            ]);
        });
    } else {
        console.warn("Data type for PDF export is unclear or mixed.");
        return;
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
      headStyles: { fillColor: [22, 160, 133] }, 
      styles: { fontSize: 9, cellPadding: 2 },
      columnStyles: { // Adjust column alignment based on the number of columns
          [(tableColumn.length - 2)]: { halign: 'right' } // Amount column
      }
    });

    doc.save(fileName);
    console.log("PDF generation successful, save prompted:", fileName);
  } catch (error) {
    console.error("Error generating PDF:", error);
    alert("Error generating PDF. Please check the console for details."); 
  }
};