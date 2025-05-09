import React from 'react';
import classNames from 'classnames';
import { Loader2 } from 'lucide-react'; 

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'icon' | 'dangerOutline' | 'link'; // Added dangerOutline
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  children,
  className,
  variant = 'primary',
  size = 'md',
  isLoading,
  ...props
}) => {
  const baseStyles = "inline-flex items-center justify-center font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-150 disabled:opacity-70 disabled:cursor-not-allowed";

  const variantStyles = {
    primary: 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500',
    secondary: 'bg-primary-100 text-primary-700 hover:bg-primary-200 focus:ring-primary-500',
    outline: 'border border-gray-300 dark:border-dark-border text-gray-700 dark:text-dark-text-secondary bg-white dark:bg-dark-card hover:bg-gray-50 dark:hover:bg-gray-700 focus:ring-primary-500',
    ghost: 'text-gray-700 dark:text-dark-text-secondary hover:bg-gray-100 dark:hover:bg-gray-700 focus:ring-primary-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    icon: 'p-0 m-0 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full focus:ring-gray-300 dark:focus:ring-gray-600', 
    dangerOutline: 'border border-red-500 dark:border-red-400 text-red-500 dark:text-red-400 bg-transparent hover:bg-red-50 dark:hover:bg-red-900 dark:hover:bg-opacity-20 focus:ring-red-500', 
    link: 'text-primary-600 dark:text-dark-primary hover:text-primary-700 dark:hover:text-primary-400 hover:underline focus:ring-primary-500 dark:focus:ring-dark-primary p-0',
  };

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
    icon: 'p-1.5', 
  };
  
  const currentSizeStyles =( variant === 'icon' || variant === 'link') ? sizeStyles.icon : sizeStyles[size];


  return (
    <button
      className={classNames(baseStyles, variantStyles[variant], variant !== 'link' ? currentSizeStyles: '', className)}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading && <Loader2 className="animate-spin h-4 w-4 mr-2" />} 
      {children}
    </button>
  );
};

export default Button;