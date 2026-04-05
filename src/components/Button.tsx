import { ReactNode } from "react";

interface ButtonProps {
  children: ReactNode;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
  icon?: ReactNode;
}

export default function Button({
  children, variant = "primary", size = "md", fullWidth = false,
  disabled = false, onClick, className = "", icon,
}: ButtonProps) {
  const variants = {
    primary: "bg-primary text-white hover:bg-primary-dark active:bg-primary-dark shadow-sm",
    secondary: "bg-text-primary text-white hover:bg-gray-800 active:bg-gray-900 shadow-sm",
    outline: "bg-white border border-border text-text-primary hover:bg-surface-secondary active:bg-surface-secondary",
    ghost: "bg-transparent text-text-secondary hover:bg-surface-secondary active:bg-surface-secondary",
    danger: "bg-error text-white hover:bg-red-700 active:bg-red-800 shadow-sm",
  };
  const sizes = {
    sm: "px-3.5 py-2 text-[13px] rounded-lg gap-1.5",
    md: "px-5 py-2.5 text-[14px] rounded-xl gap-2",
    lg: "px-6 py-3.5 text-[15px] rounded-xl gap-2",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center font-semibold transition-all duration-150 ${variants[variant]} ${sizes[size]} ${
        fullWidth ? "w-full" : ""
      } ${disabled ? "opacity-50 cursor-not-allowed" : "active:scale-[0.98]"} ${className}`}
    >
      {icon}
      {children}
    </button>
  );
}
