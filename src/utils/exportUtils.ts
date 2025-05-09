import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable'; // Import autoTable as default
import type { Expense } from '../types';
import { formatInTimeZone } from 'date-fns-tz';

// No need for the interface jsPDFWithAutoTable if we call autoTable as a function

export const exportToPdf = (expenses: Expense[], fileName: string, reportTitle: string, timeZone: string): void => {
  console.log("Exporting to PDF with data:", expenses); 
  if (!expenses || expenses.length === 0) {
    console.warn("No expenses to export to PDF.");
    return;
  }

  try {
    const doc = new jsPDF(); 

    const tableColumn = ["Date", "Category", "Sub-Category", "Amount (₹)", "Description"];
    const tableRows: (string | number)[][] = [];

    expenses.forEach(exp => {
      const expenseData = [
        formatInTimeZone(new Date(exp.expense_date), timeZone, 'dd MMM yy, hh:mm a'),
        exp.category,
        exp.sub_category || 'N/A',
        exp.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        exp.description || 'N/A',
      ];
      tableRows.push(expenseData);
    });

    doc.setFontSize(18);
    doc.text(reportTitle, 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);

    // Call autoTable as a function, passing the doc instance
    autoTable(doc, { 
      head: [tableColumn],
      body: tableRows,
      startY: 30,
      theme: 'grid', 
      headStyles: { fillColor: [22, 160, 133] }, 
      styles: { fontSize: 9, cellPadding: 2 },
      columnStyles: {
          3: { halign: 'right' } 
      }
    });

    doc.save(fileName);
    console.log("PDF generation successful, save prompted:", fileName);
  } catch (error) {
    console.error("Error generating PDF:", error);
    alert("Error generating PDF. Please check the console for details."); 
  }
};