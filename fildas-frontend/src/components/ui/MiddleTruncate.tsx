
/** 
 * Truncates in the middle responsively using CSS: "Faculty Accompli...e.pdf" 
 */
export default function MiddleTruncate({ 
  text, 
  className = "" 
}: { 
  text: string | null | undefined;
  className?: string;
}) {
  if (!text) return <span>—</span>;
  
  // Split the string approx in middle
  const mid = Math.ceil(text.length / 2);
  const start = text.substring(0, mid);
  const end = text.substring(mid);

  return (
    <div className={`flex min-w-0 max-w-full overflow-hidden ${className}`}>
      <span className="truncate min-w-0 whitespace-pre">{start}</span>
      <span className="shrink-0 whitespace-pre">{end}</span>
    </div>
  );
}
