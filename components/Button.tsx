import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  isLoading, 
  className = '', 
  ...props 
}) => {
  // Clean, modern pill shape
  const baseStyle = "font-medium text-sm tracking-wide py-3 px-8 rounded-full transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm";
  
  const variants = {
    // White solid for primary action
    primary: "bg-white text-black hover:bg-gray-100 border border-transparent",
    // Translucent glass for secondary
    secondary: "bg-white/10 text-white hover:bg-white/20 border border-white/10 backdrop-blur-sm",
    // Subtle red tint for danger
    danger: "bg-red-500/10 text-red-200 hover:bg-red-500/20 border border-red-500/20",
  };

  return (
    <button 
      className={`${baseStyle} ${variants[variant]} ${className}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? (
        <>
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Processing</span>
        </>
      ) : children}
    </button>
  );
};