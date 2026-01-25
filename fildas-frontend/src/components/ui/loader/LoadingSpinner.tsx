import React from "react";

interface LoadingSpinnerProps {
  message?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = "Loading...",
}) => (
  <div className="flex h-full items-center justify-center bg-white/90 backdrop-blur-sm">
    <div className="text-center p-8 rounded-xl shadow-lg max-w-sm mx-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600 mx-auto mb-4"></div>
      <p className="text-lg font-semibold text-slate-800 mb-1">{message}</p>
      <p className="text-sm text-slate-600">
        {message === "Loading..." ? "Please wait while we load the data." : ""}
      </p>
    </div>
  </div>
);

export default LoadingSpinner;
