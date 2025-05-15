// src/components/ui/DateRangeModal.tsx
import React, { useState } from 'react';
import Modal from './Modal'; // Assuming you have a generic Modal component
import Input from './Input';   // Assuming you have a generic Input component
import Button from './Button'; // Assuming you have a generic Button component
import { X, CalendarDays, Download } from 'lucide-react';
import { format, isValid, parseISO } from 'date-fns';

interface DateRangeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onExport: (startDate: string, endDate: string) => void;
    title?: string;
}

const DateRangeModal: React.FC<DateRangeModalProps> = ({
    isOpen,
    onClose,
    onExport,
    title = "Select Date Range for PDF Export"
}) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const [startDate, setStartDate] = useState<string>(today);
    const [endDate, setEndDate] = useState<string>(today);
    const [error, setError] = useState<string>('');

    const handleExportClick = () => {
        setError('');
        if (!startDate || !endDate) {
            setError('Both start and end dates are required.');
            return;
        }
        const parsedStartDate = parseISO(startDate);
        const parsedEndDate = parseISO(endDate);

        if (!isValid(parsedStartDate) || !isValid(parsedEndDate)) {
            setError('Invalid date format selected.');
            return;
        }

        if (parsedEndDate < parsedStartDate) {
            setError('End date cannot be before start date.');
            return;
        }
        onExport(startDate, endDate);
        onClose(); // Close modal after export initiated
    };

    const handleModalClose = () => {
        setError(''); // Clear error when closing
        onClose();
    }

    // No need to render anything if the modal is not open
    if (!isOpen) return null;

    return (
        // The Modal component itself will handle its base styling and visibility.
        // We remove widthClass from here.
        <Modal isOpen={isOpen} onClose={handleModalClose} title={title}>
            {/* Apply width styling to a wrapper div inside the Modal's children */}
            <div className="max-w-md w-full p-2"> {/* Added w-full for better responsiveness within modal constraints */}
                <div className="space-y-4">
                    <Input
                        id="pdfStartDate"
                        type="date"
                        label="Start Date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        icon={<CalendarDays size={18} className="text-gray-400 dark:text-dark-text-secondary" />}
                        max={today}
                    />
                    <Input
                        id="pdfEndDate"
                        type="date"
                        label="End Date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        icon={<CalendarDays size={18} className="text-gray-400 dark:text-dark-text-secondary" />}
                        max={today}
                        min={startDate}
                    />
                    {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
                    <div className="flex justify-end space-x-3 pt-2">
                        <Button variant="outline" onClick={handleModalClose}>
                            <X size={18} className="mr-2" /> Cancel
                        </Button>
                        <Button variant="primary" onClick={handleExportClick}>
                            <Download size={18} className="mr-2" /> Export PDF
                        </Button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default DateRangeModal;