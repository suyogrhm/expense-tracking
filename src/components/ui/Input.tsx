import React from 'react';
import classNames from 'classnames';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: React.ReactNode;
  containerClassName?: string;
}

const Input: React.FC<InputProps> = ({ label, id, icon, containerClassName, className, ...props }) => {
  const inputId = id || props.name;
  return (
    <div className={classNames("w-full", containerClassName)}>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
          {label}
        </label>
      )}
      <div className="relative rounded-md shadow-sm">
        {icon && (
          <div className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center">
            {icon} {/* Icon color will be inherited or can be set specifically */}
          </div>
        )}
        <input
          id={inputId}
          className={classNames(
            "block w-full px-3 py-2 rounded-md focus:outline-none sm:text-sm",
            "input-bg-color input-border-color input-text-color placeholder-color", // Using classes from index.css
            "focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-dark-primary dark:focus:border-dark-primary",
            icon ? "pl-10" : "",
            props.type === 'number' ? "pr-3 text-right" : "", 
            className
          )}
          {...props}
        />
      </div>
    </div>
  );
};

export default Input;