import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Button ---
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children, className, variant = 'primary', size = 'md', isLoading, ...props
}) => {
  const variants = {
    primary: 'bg-medical-600 text-white hover:bg-medical-700 shadow-md shadow-medical-500/20 border-transparent',
    secondary: 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md border-transparent',
    outline: 'border-gray-300 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 bg-transparent border',
    ghost: 'bg-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 border-transparent',
    danger: 'bg-red-500 text-white hover:bg-red-600 shadow-md border-transparent',
  };

  const sizes = {
    sm: 'h-8 px-3 text-xs',
    md: 'h-11 px-4 text-sm',
    lg: 'h-14 px-6 text-base font-medium',
  };

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none font-medium focus:outline-none focus:ring-2 focus:ring-medical-500/50 focus:ring-offset-2 dark:focus:ring-offset-gray-900',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : null}
      {children}
    </button>
  );
};

// --- Card ---
export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, children, ...props }) => (
  <div className={cn("bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/50 overflow-hidden", className)} {...props}>
    {children}
  </div>
);

// --- Input ---
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  endAdornment?: React.ReactNode;
  startAdornment?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, endAdornment, ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5">
        {label && <label className="text-sm font-medium text-gray-700 dark:text-gray-300 ml-1">{label}</label>}
        <div className="relative">
          {props.startAdornment && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 flex items-center pointer-events-none">
              {props.startAdornment}
            </div>
          )}
          <input
            className={cn(
              "flex h-12 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-medical-500 focus-visible:border-transparent disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-100 dark:placeholder:text-gray-500",
              endAdornment && "pr-10",
              props.startAdornment && "pl-10",
              error && "border-red-500 focus-visible:ring-red-500",
              className
            )}
            ref={ref}
            {...props}
          />
          {endAdornment && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 flex items-center">
              {endAdornment}
            </div>
          )}
        </div>
        {error && <span className="text-xs text-red-500 ml-1">{error}</span>}
      </div>
    );
  }
);
Input.displayName = "Input";

// --- Select ---
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

export const Select: React.FC<SelectProps> = ({ label, options, className, ...props }) => (
  <div className="w-full space-y-1.5">
    {label && <label className="text-sm font-medium text-gray-700 dark:text-gray-300 ml-1">{label}</label>}
    <div className="relative">
      <select
        className={cn(
          "flex h-12 w-full appearance-none rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-medical-500 focus-visible:border-transparent disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-100",
          className
        )}
        {...props}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
      </div>
    </div>
  </div>
);

// --- Badge ---
// --- Badge ---
export const Badge: React.FC<React.HTMLAttributes<HTMLSpanElement> & { variant?: 'success' | 'warning' | 'error' | 'neutral' | 'default' | 'outline' }> = ({ variant = 'neutral', className, children, ...props }) => {
  const styles = {
    success: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    warning: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    error: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    neutral: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    default: 'bg-indigo-600 text-white shadow-sm', // Added for interactive active state
    outline: 'bg-transparent border border-gray-300 text-gray-600 dark:border-gray-600 dark:text-gray-300', // Added for interactive inactive state
  };
  // Fallback to neutral if variant not found (for safety)
  const styleClass = styles[variant] || styles.neutral;

  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors duration-200", styleClass, className)} {...props}>
      {children}
    </span>
  );
};