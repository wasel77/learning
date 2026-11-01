import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "misk-input h-11 w-full rounded-xl border px-4 text-sm outline-none transition",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "misk-input min-h-28 w-full rounded-xl border px-4 py-3 text-sm outline-none transition",
        className,
      )}
      {...props}
    />
  );
}
