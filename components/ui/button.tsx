import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "misk-button-primary",
        secondary: "misk-button-secondary",
        ghost: "text-slate-300 hover:bg-slate-800 hover:text-white",
        danger: "bg-red-500/15 text-red-200 hover:bg-red-500/25",
      },
      size: {
        default: "h-11 px-5",
        sm: "h-9 px-3",
        lg: "h-13 px-7 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, ...props },
  ref,
) {
  return <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
});

export function buttonClassName(variant?: VariantProps<typeof buttonVariants>["variant"]) {
  return buttonVariants({ variant });
}
