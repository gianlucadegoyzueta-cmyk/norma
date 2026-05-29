import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Unisce classi condizionali (clsx) risolvendo i conflitti di utility Tailwind
 * (twMerge). Es. cn("p-2", isLarge && "p-4") → "p-4".
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
