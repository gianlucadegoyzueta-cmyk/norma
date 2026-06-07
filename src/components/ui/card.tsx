import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Varianti semantiche della Card: invece di rifare a mano `border-warning/40 bg-warning/5` in
 * ogni pagina (incoerente), si usa `<Card variant="warning">`. `default` = la card neutra di sempre.
 */
export type CardVariant = "default" | "info" | "success" | "warning" | "destructive";

const CARD_VARIANTS: Record<CardVariant, string> = {
  default: "border-border bg-card",
  info: "border-primary/30 bg-primary/5",
  success: "border-success/30 bg-success/8",
  warning: "border-warning/40 bg-warning/8",
  destructive: "border-destructive/35 bg-destructive/6",
};

export function Card({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { variant?: CardVariant }) {
  return (
    <div
      className={cn(
        "text-card-foreground shadow-card rounded-xl border",
        CARD_VARIANTS[variant],
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-1.5 p-6", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("font-display text-lg leading-none font-semibold tracking-tight", className)}
      {...props}
    />
  );
}

export function CardDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-muted-foreground text-sm", className)} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-6 pt-0", className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-center p-6 pt-0", className)} {...props} />;
}
