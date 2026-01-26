import React from "react";
import Skeleton from "./Skeleton";

type Props = {
  rows?: number;
  rowClassName?: string;
  className?: string;
};

const SkeletonList: React.FC<Props> = ({
  rows = 3,
  rowClassName = "h-10",
  className = "space-y-2",
}) => {
  return (
    <div className={["animate-pulse", className].join(" ")}>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className={rowClassName} />
      ))}
    </div>
  );
};

export default SkeletonList;
