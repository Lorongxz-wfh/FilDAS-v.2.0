import React, { useRef, useEffect } from "react";
import { Loader2, Send } from "lucide-react";

interface CommentComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  isSending: boolean;
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
}

const CommentComposer: React.FC<CommentComposerProps> = ({
  value,
  onChange,
  onSend,
  isSending,
  placeholder = "Write a comment...",
  disabled = false,
  autoFocus = false,
  className = "",
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-expand logic
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 128)}px`;
    }
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      if (!isSending && value.trim() && !disabled) {
        onSend();
      }
    }
  };

  const isDisabled = disabled || isSending;

  return (
    <div className="flex flex-col gap-1.5 shrink-0">
      <div 
        className={`flex items-end gap-2 bg-white dark:bg-surface-500 border border-slate-200 dark:border-surface-400 rounded-lg p-1 transition-colors focus-within:border-slate-400 dark:focus-within:border-slate-300 ${className}`}
      >
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          disabled={isDisabled}
          className="flex-1 bg-transparent px-2.5 py-2 text-[13px] text-slate-800 dark:text-slate-100 outline-none resize-none min-h-[36px] placeholder:text-slate-400 dark:placeholder:text-slate-500 leading-snug"
        />
        
        <button
          type="button"
          disabled={isDisabled || !value.trim()}
          onClick={onSend}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 transition-colors hover:bg-slate-900 dark:hover:bg-white disabled:opacity-20 disabled:pointer-events-none active:scale-95 mb-0.5"
          title="Send (Ctrl+Enter)"
        >
          {isSending ? (
            <Loader2 className="animate-spin h-3.5 w-3.5 stroke-[2.5px]" />
          ) : (
            <Send className="h-3.5 w-3.5 stroke-[2.5px]" />
          )}
        </button>
      </div>
      <div className="flex justify-between px-1">
        <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">
          {isSending ? "Sending message..." : "Press Ctrl + Enter to send"}
        </span>
      </div>
    </div>
  );
};

export default CommentComposer;
