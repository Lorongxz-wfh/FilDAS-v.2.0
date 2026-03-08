import React from "react";

type DivProps = React.HTMLAttributes<HTMLDivElement>;

export function Card({ className = "", ...props }: DivProps) {
  return (
    <div
      {...props}
      className={[
        "rounded-2xl border border-slate-200 bg-white shadow-sm",
        "dark:border-surface-400 dark:bg-surface-500",
        className,
      ].join(" ")}
    />
  );
}

export function CardHeader({ className = "", ...props }: DivProps) {
  return (
    <div
      {...props}
      className={[
        "px-5 py-4 border-b border-slate-200",
        "dark:border-surface-400",
        className,
      ].join(" ")}
    />
  );
}

export function CardBody({ className = "", ...props }: DivProps) {
  return <div {...props} className={["px-5 py-4", className].join(" ")} />;
}

export function CardFooter({ className = "", ...props }: DivProps) {
  return (
    <div
      {...props}
      className={[
        "px-5 py-4 border-t border-slate-200",
        "dark:border-surface-400",
        className,
      ].join(" ")}
    />
  );
}
