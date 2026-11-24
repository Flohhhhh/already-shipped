import { Input as InputPrimitive } from "@base-ui/react/input";
import type { ComponentProps } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";

const inputVariants = cva(
  "w-full min-w-0 border border-input bg-transparent text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20",
  {
    variants: {
      variant: {
        default: "h-11 rounded-lg px-3 md:h-8 md:text-sm dark:bg-input/30",
        search:
          "h-14 rounded-full border-border/70 bg-card/80 pr-16 pl-12 shadow-[0_8px_30px_rgba(0,0,0,0.05)] backdrop-blur-xl focus-visible:border-foreground/15 focus-visible:ring-foreground/10 dark:bg-card/70 dark:shadow-[0_8px_30px_rgba(0,0,0,0.28)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Input({
  className,
  variant = "default",
  type,
  ...props
}: ComponentProps<"input"> & VariantProps<typeof inputVariants>) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(inputVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Input, inputVariants };
