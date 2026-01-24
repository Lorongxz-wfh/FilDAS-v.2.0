import React from "react";

type DivProps = React.HTMLAttributes<HTMLDivElement>;

export function Card({ className = "", ...props }: DivProps) {
  return (
    <div
      {...props}
      className={`rounded-xl border border-slate-200 bg-white ${className}`}
    />
  );
}

export function CardHeader({ className = "", ...props }: DivProps) {
  return <div {...props} className={`px-6 py-4 ${className}`} />;
}

export function CardBody({ className = "", ...props }: DivProps) {
  return <div {...props} className={`px-6 py-4 ${className}`} />;
}

export function CardFooter({ className = "", ...props }: DivProps) {
  return (
    <div
      {...props}
      className={`px-6 py-4 border-t border-slate-200 ${className}`}
    />
  );
}
