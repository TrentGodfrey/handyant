type Props = { size?: "sm" | "md" | "lg"; className?: string };

/**
 * Branded loading spinner. The size prop maps to:
 *   sm → h-4 w-4
 *   md → h-6 w-6 (default)
 *   lg → h-10 w-10
 *
 * For non-standard sizes (e.g. h-5/h-7/h-8) pass `className` to override
 * the dimensions; the override wins thanks to Tailwind's source order.
 */
export default function Spinner({ size = "md", className = "" }: Props) {
  const sizeClass = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-10 w-10" : "h-6 w-6";
  return (
    <div
      className={`${sizeClass} border-2 border-primary border-t-transparent rounded-full animate-spin ${className}`}
    />
  );
}
