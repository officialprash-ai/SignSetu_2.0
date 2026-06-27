"use client";
import { CornerRightUp, Mic } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useAutoResizeTextarea } from "@/components/hooks/use-auto-resize-textarea";

interface AIInputProps {
  id?: string;
  placeholder?: string;
  minHeight?: number;
  maxHeight?: number;
  /** Controlled value (optional). Falls back to internal state when omitted. */
  value?: string;
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
  /** Optional handler for the mic button; renders the button when provided. */
  onMic?: () => void;
  disabled?: boolean;
  className?: string;
}

export function AIInput({
  id = "ai-input",
  placeholder = "Type your message...",
  minHeight = 56,
  maxHeight = 200,
  value,
  onChange,
  onSubmit,
  onMic,
  disabled = false,
  className,
}: AIInputProps) {
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({ minHeight, maxHeight });

  const [internal, setInternal] = useState("");
  const isControlled = value !== undefined;
  const inputValue = isControlled ? value : internal;

  const setValue = (v: string) => {
    if (!isControlled) setInternal(v);
    onChange?.(v);
  };

  // Re-fit height when a controlled value changes externally (voice/youtube fill)
  useEffect(() => {
    adjustHeight();
  }, [inputValue, adjustHeight]);

  const handleSubmit = () => {
    if (!inputValue.trim() || disabled) return;
    onSubmit?.(inputValue);
    if (!isControlled) setInternal("");
    adjustHeight(true);
  };

  return (
    <div className={cn("w-full", className)}>
      <div className="relative w-full">
        <textarea
          id={id}
          ref={textareaRef}
          placeholder={placeholder}
          disabled={disabled}
          value={inputValue}
          onChange={(e) => { setValue(e.target.value); adjustHeight(); }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          style={{ minHeight, maxHeight }}
          className={cn(
            "w-full resize-none rounded-2xl bg-muted/60 border border-border",
            "pl-5 pr-24 py-4 text-sm leading-[1.4] text-foreground",
            "placeholder:text-muted-foreground",
            "outline-none transition-[height,box-shadow,border-color] duration-150 ease-out",
            "focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary/50",
            "overflow-y-auto disabled:opacity-50 disabled:cursor-not-allowed",
            "[&::-webkit-resizer]:hidden"
          )}
        />

        {/* Mic button */}
        {onMic && (
          <button
            type="button"
            onClick={onMic}
            disabled={disabled}
            aria-label="Switch to voice input"
            className={cn(
              "absolute top-1/2 -translate-y-1/2 flex items-center justify-center",
              "h-9 w-9 rounded-xl bg-background/80 border border-border",
              "text-muted-foreground hover:text-primary hover:border-primary/40",
              "transition-all duration-200",
              inputValue ? "right-[3.25rem]" : "right-3"
            )}
          >
            <Mic className="w-4 h-4" />
          </button>
        )}

        {/* Submit button */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={disabled || !inputValue.trim()}
          aria-label="Submit"
          className={cn(
            "absolute top-1/2 -translate-y-1/2 right-3 flex items-center justify-center",
            "h-9 w-9 rounded-xl bg-primary text-primary-foreground shadow-sm",
            "transition-all duration-200 hover:opacity-90",
            inputValue.trim()
              ? "opacity-100 scale-100"
              : "opacity-0 scale-95 pointer-events-none"
          )}
        >
          <CornerRightUp className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
