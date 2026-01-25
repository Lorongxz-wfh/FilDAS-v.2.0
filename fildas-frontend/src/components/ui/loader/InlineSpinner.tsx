import React from "react";

interface InlineSpinnerProps {
  className?: string;
}

const InlineSpinner: React.FC<InlineSpinnerProps> = ({ className = "" }) => {
  return (
    <span
      className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-sky-600 ${className}`}
      aria-label="Loading"
    />
  );
};

export default InlineSpinner;
