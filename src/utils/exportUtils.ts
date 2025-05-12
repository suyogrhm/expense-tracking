import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Expense, Income } from '../types'; // Ensure Tag is imported if used in formatting
// Ensure Tag is imported if used in formatting
import { formatInTimeZone, format } from 'date-fns-tz';
import { isValid, parseISO } from 'date-fns';

type Color = [number, number, number];

function isExpense(item: Expense | Income): item is Expense {
  return (item as Expense).category !== undefined;
}

const formatDate = (dateStr: string | undefined | null, timeZone: string): string => {
  if (!dateStr) {
    return 'No Date';
  }
  
  try {
    const date = parseISO(dateStr);
    if (!isValid(date)) {
      return 'Invalid Date';
    }
    return formatInTimeZone(date, timeZone, 'dd MMM yy, hh:mm a');
  } catch (error) {
    console.error('Error formatting date:', dateStr, error);
    return 'Invalid Date';
  }
};

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
    const tableColumn = ["Type", "Date", "Category/Source", "Amount", "Description", "Tags"];
    const tableRows: (string | number)[][] = [];

    // Add current time to the report
    const currentTime = format(new Date(), 'dd MMM yyyy at HH:mm');
    const subTitle = `Generated on ${currentTime}`;

    data.forEach(item => {
      const isExpenseItem = isExpense(item);
      const type = isExpenseItem ? 'Expense' : 'Income';
      const date = formatDate(isExpenseItem ? item.expense_date : item.income_date, timeZone);
      const category = isExpenseItem ? item.category : item.source;
      const amount = item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 });
      const description = item.description || 'N/A';
      const tagsString = item.tags?.map(t => t.name).join(', ') || 'N/A';

      tableRows.push([
        type,
        date,
        category,
        amount,
        description,
        tagsString,
      ]);
    });

    // Add title and subtitle
    doc.setFontSize(18);
    doc.text(reportTitle, 14, 20);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(subTitle, 14, 28);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 35,
      theme: 'grid',
      headStyles: { 
        fillColor: [26, 188, 156], // Emerald green color
        textColor: 255,
        fontSize: 10,
        fontStyle: 'bold',
        halign: 'left'
      },
      styles: {
        fontSize: 9,
        cellPadding: 3,
        lineColor: [200, 200, 200],
        lineWidth: 0.1
      },
      columnStyles: {
        0: { cellWidth: 'auto' }, // Type
        1: { cellWidth: 'auto' }, // Date
        2: { cellWidth: 'auto' }, // Category/Source
        3: { 
          cellWidth: 'auto',
          halign: 'right'
        }, // Amount
        4: { cellWidth: 'auto' }, // Description
        5: { cellWidth: 'auto' } // Tags
      },
      alternateRowStyles: {
        fillColor: [249, 249, 249]
      },
      willDrawCell: function(data) {
        if (data.section === 'body' && data.column.index === 0) {
          const rowData = data.row.raw as unknown[];
          const type = rowData[0] as string;
          if (type === 'Income') {
            data.cell.styles.textColor = [22, 163, 74]; // Green text for income
          } else {
            data.cell.styles.textColor = [220, 38, 38]; // Red text for expense
          }
        }
      }
    });

    doc.save(fileName);
    console.log("PDF generation successful, save prompted:", fileName);
  } catch (error) {
    console.error("Error generating PDF:", error);
    alert("Error generating PDF. Please check the console for details.");
  }
};