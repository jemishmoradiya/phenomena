import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Combines conditional class names (clsx) and resolves Tailwind class conflicts (tailwind-merge). */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
