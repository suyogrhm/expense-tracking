import React from 'react';
import classNames from 'classnames';
import { ChevronDown } from 'lucide-react';

interface SelectOption {
  value: string | number;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  prompt?: string; 
  icon?: React.ReactNode;
  containerClassName?: string;
}

const SelectUI: React.FC<SelectProps> = ({ 
  label,
  id,
  options,
  prompt,
  icon,
  containerClassName,
  className,
  ...props
}) => {
  const selectId = id || props.name;
  return (
    <div className={classNames("w-full", containerClassName)}>
      {label && (
        <label htmlFor={selectId} className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center">
            {icon} 
          </div>
        )}
        <select
          id={selectId}
          className={classNames(
            "block w-full appearance-none py-2 px-3 pr-8 rounded-md leading-tight",
            "input-bg-color input-border-color input-text-color", 
            "focus:outline-none focus:bg-white dark:focus:bg-dark-input focus:border-primary-500 dark:focus:border-dark-primary focus:ring-1 focus:ring-primary-500 dark:focus:ring-dark-primary sm:text-sm",
            icon ? "pl-10" : "",
            className
          )}
          {...props}
        >
          {prompt && <option value="">{prompt}</option>}
          {options.map((option) => (
            <option key={option.value.toString()} value={option.value} className="bg-white dark:bg-dark-card dark:text-dark-text"> 
              {option.label}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-dark-text-secondary">
          <ChevronDown size={20} />
        </div>
      </div>
    </div>
  );
};

export default SelectUI; 