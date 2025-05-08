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
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <div className="relative rounded-md shadow-sm">
        {icon && (
          <div className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center">
            {icon}
          </div>
        )}
        <input
          id={inputId}
          className={classNames(
            "block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none sm:text-sm",
            "focus:ring-primary-500 focus:border-primary-500",
            icon ? "pl-10" : "",
            className
          )}
          {...props}
        />
      </div>
    </div>
  );
};

export default Input;