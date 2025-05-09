import React from 'react';
import classNames from 'classnames';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  containerClassName?: string;
}

const Textarea: React.FC<TextareaProps> = ({ label, id, containerClassName, className, ...props }) => {
  const textareaId = id || props.name;
  return (
    <div className={classNames("w-full", containerClassName)}>
      {label && (
        <label htmlFor={textareaId} className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        className={classNames(
          "form-input-base", // Use the global base styling for inputs
          "py-2 px-3", "dark:text-dark-text-secondary","dark:border-dark-border", "rounded","dark:bg-dark-card","dark:hover:bg-gray-700",       // Ensure consistent padding with inputs
          className
        )}
        {...props}
      />
    </div>
  );
};

export default Textarea;