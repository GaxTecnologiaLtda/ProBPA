import React, { Fragment, useState } from 'react';
import { X, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';

// --- BUTTON ---
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'success';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ElementType;
}

export const Button: React.FC<ButtonProps & { isLoading?: boolean }> = ({ variant = 'primary', size = 'md', icon: Icon, className = '', children, isLoading, ...props }) => {
  const baseStyles = "inline-flex items-center justify-center rounded-lg font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

  const variants = {
    primary: "bg-gradient-to-r from-corp-600 to-corp-500 hover:from-corp-700 hover:to-corp-600 text-white shadow-md shadow-corp-500/20 focus:ring-corp-500",
    secondary: "bg-slate-800 text-white hover:bg-slate-700 focus:ring-slate-500 border border-slate-700",
    outline: "border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 focus:ring-slate-400",
    danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
    ghost: "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800",
    success: "bg-gradient-to-r from-gax-600 to-gax-500 hover:from-gax-700 hover:to-gax-600 text-white shadow-md shadow-gax-500/20 focus:ring-gax-500",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : (
        Icon && <Icon className={`w-4 h-4 ${children ? 'mr-2' : ''}`} />
      )}
      {children}
    </button>
  );
};

// --- SWITCH ---
interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export const Switch: React.FC<SwitchProps> = ({ checked, onChange, disabled = false }) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`
        relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-corp-500 focus-visible:ring-offset-2
        ${checked ? 'bg-corp-600' : 'bg-slate-200 dark:bg-slate-700'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <span className="sr-only">Use setting</span>
      <span
        aria-hidden="true"
        className={`
          pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out
          ${checked ? 'translate-x-5' : 'translate-x-0'}
        `}
      />
    </button>
  );
};

// --- CARD ---
export const Card: React.FC<{ children: React.ReactNode; className?: string; title?: string; action?: React.ReactNode }> = ({ children, className = '', title, action }) => {
  return (
    <div className={`bg-white dark:bg-dark-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 ${className}`}>
      {(title || action) && (
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
          {title && <h3 className="font-semibold text-slate-800 dark:text-white">{title}</h3>}
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
};

// --- COLLAPSIBLE SECTION ---
interface CollapsibleSectionProps {
  title: string;
  count?: number;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  icon?: React.ElementType;
  colorClass?: string; // e.g., "text-blue-500"
  maxHeight?: string; // e.g., "max-h-[600px]" or "max-h-[60vh]" to enable scrolling
}

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  count,
  isOpen,
  onToggle,
  children,
  icon: Icon,
  colorClass = "text-slate-600 dark:text-slate-300",
  maxHeight = ""
}) => {
  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-dark-800 shadow-sm transition-all duration-300">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-6 py-4 bg-slate-50 dark:bg-dark-900/50 hover:bg-slate-100 dark:hover:bg-dark-900 transition-colors"
      >
        <div className="flex items-center gap-3">
          {Icon && <Icon className={`w-5 h-5 ${colorClass}`} />}
          <span className="font-semibold text-slate-800 dark:text-white">{title}</span>
          {count !== undefined && (
            <span className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium px-2.5 py-0.5 rounded-full">
              {count}
            </span>
          )}
        </div>
        <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Wrapper for the expansion animation */}
      <div className={`transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="border-t border-slate-100 dark:border-slate-700">
          {/* 
              Inner content wrapper that handles scrolling if maxHeight is provided.
              We add custom scrollbar styling classes here.
            */}
          <div className={`p-6 ${maxHeight} ${maxHeight ? 'overflow-y-auto pr-2 custom-scrollbar' : ''}`}>
            {children}
          </div>
        </div>
      </div>

      {/* Inject global styles for this component's scrollbar if needed, though usually done in global CSS. 
          Here is an inline style approach for the custom scrollbar to ensure it works immediately. */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #cbd5e1;
          border-radius: 20px;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #334155;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: #94a3b8;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: #475569;
        }
      `}</style>
    </div>
  );
};

// --- INPUT ---
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}
export const Input: React.FC<InputProps> = ({ label, error, className = '', ...props }) => {
  return (
    <div className="w-full">
      {label && <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</label>}
      <input
        className={`w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-dark-900 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:border-corp-500 focus:outline-none focus:ring-1 focus:ring-corp-500 disabled:bg-slate-100 dark:disabled:bg-slate-800 transition-colors ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''} ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
};

// --- SELECT ---
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}
export const Select: React.FC<SelectProps> = ({ label, options, className = '', ...props }) => {
  return (
    <div className="w-full">
      {label && <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</label>}
      <select
        className={`w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-dark-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-corp-500 focus:outline-none focus:ring-1 focus:ring-corp-500 ${className}`}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
};

// --- BADGE ---
export const Badge: React.FC<{ children: React.ReactNode; variant?: 'success' | 'warning' | 'error' | 'neutral' | 'info' }> = ({ children, variant = 'neutral' }) => {
  const styles = {
    success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30",
    warning: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 border-amber-200 dark:border-amber-500/30",
    error: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400 border-rose-200 dark:border-rose-500/30",
    neutral: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600",
    info: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 border-blue-200 dark:border-blue-500/30",
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[variant]}`}>
      {children}
    </span>
  );
};

// --- MODAL ---
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}
export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, footer }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity" onClick={onClose} />

      {/* Content */}
      <div className="relative w-full max-w-2xl transform rounded-xl bg-white dark:bg-dark-800 text-left shadow-2xl transition-all border border-slate-200 dark:border-slate-700 flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-500 dark:hover:text-slate-300">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-6 overflow-y-auto">
          {children}
        </div>
        {footer && (
          <div className="px-6 py-4 bg-slate-50 dark:bg-dark-900/50 border-t border-slate-100 dark:border-slate-700 rounded-b-xl flex justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

// --- TOOLTIP ---
export const Tooltip: React.FC<{ content: string; children: React.ReactNode }> = ({ content, children }) => {
  return (
    <div className="group/tooltip relative inline-block">
      {children}
      <div className="invisible group-hover/tooltip:visible opacity-0 group-hover/tooltip:opacity-100 transition-all duration-200 absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2.5 py-1 bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-medium rounded-md shadow-lg whitespace-nowrap z-50 pointer-events-none">
        {content}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-slate-800 dark:border-t-slate-100"></div>
      </div>
    </div>
  );
};

// --- TABLE ---
export const Table: React.FC<{ headers: string[]; children: React.ReactNode }> = ({ headers, children }) => {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
      <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
        <thead className="bg-slate-50 dark:bg-dark-900/50">
          <tr>
            {headers.map((h, i) => (
              <th key={i} className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-dark-800 divide-y divide-slate-200 dark:divide-slate-700">
          {children}
        </tbody>
      </table>
    </div>
  );
};