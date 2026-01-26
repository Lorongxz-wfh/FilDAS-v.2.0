import React from "react";

type Props = {
  className?: string;
};

const Skeleton: React.FC<Props> = ({ className = "" }) => {
  return (
    <div
      className={[
        "animate-pulse rounded-md bg-slate-100 border border-slate-200",
        className,
      ].join(" ")}
    />
  );
};

export default Skeleton;
