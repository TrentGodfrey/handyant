import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  padding?: "sm" | "md" | "lg";
  variant?: "default" | "outlined" | "flat";
}

export default function Card({ children, className = "", onClick, padding = "md", variant = "default" }: CardProps) {
  const paddings = { sm: "p-3.5", md: "p-4", lg: "p-5" };
  const variants = {
    default: "bg-surface rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.08),0_4px_16px_rgba(0,0,0,0.04)]",
    outlined: "bg-surface rounded-xl border border-border",
    flat: "bg-surface-secondary rounded-xl",
  };
  const Component = onClick ? "button" : "div";
  return (
    <Component
      onClick={onClick}
      className={`${variants[variant]} ${paddings[padding]} ${
        onClick ? "active:scale-[0.985] transition-all duration-150 cursor-pointer text-left w-full hover:shadow-[0_4px_12px_rgba(0,0,0,0.10)]" : ""
      } ${className}`}
    >
      {children}
    </Component>
  );
}
