import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function globalSearch(obj: any, term: string): boolean {
  if (!term) return true;
  const s = term.toLowerCase();

  const searchValues = (o: any): boolean => {
    if (o === null || o === undefined) return false;
    if (typeof o === 'string' || typeof o === 'number' || typeof o === 'boolean') {
      return o.toString().toLowerCase().includes(s);
    }
    if (Array.isArray(o)) {
      return o.some(item => searchValues(item));
    }
    if (typeof o === 'object') {
      // Exclude internal keys if necessary, but request says "across the entire record object"
      return Object.values(o).some(val => searchValues(val));
    }
    return false;
  };

  return searchValues(obj);
}
