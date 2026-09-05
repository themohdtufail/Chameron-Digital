import { InputHTMLAttributes, forwardRef, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "prefix"> {
  label?: string;
  error?: string;
  prefix?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, prefix, id, ...props }, ref) => {
    const inputId = id || props.name;
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-zinc-700">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {prefix && <span className="pointer-events-none absolute left-3.5 text-sm text-zinc-500">{prefix}</span>}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              "h-12 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 text-[15px] text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-100",
              prefix && "pl-9",
              error && "border-danger-500 focus:border-danger-500 focus:ring-danger-50",
              className
            )}
            {...props}
          />
        </div>
        {error && <p className="mt-1 text-xs font-medium text-danger-600">{error}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const inputId = id || props.name;
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-zinc-700">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={cn(
            "w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-3 text-[15px] text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-100",
            error && "border-danger-500 focus:border-danger-500 focus:ring-danger-50",
            className
          )}
          {...props}
        />
        {error && <p className="mt-1 text-xs font-medium text-danger-600">{error}</p>}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";
