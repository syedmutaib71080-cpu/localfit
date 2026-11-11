type ClassValue =
  | string
  | number
  | bigint
  | boolean
  | undefined
  | null
  | { [key: string]: boolean | undefined | null }
  | ClassValue[];

/**
 * Lightweight, zero-dependency className concatenator and cleaner.
 */
export function cn(...inputs: ClassValue[]): string {
  const classes: string[] = [];

  function process(item: ClassValue): void {
    if (!item) return;

    if (typeof item === "string" || typeof item === "number") {
      classes.push(String(item));
    } else if (Array.isArray(item)) {
      for (const subItem of item) {
        process(subItem);
      }
    } else if (typeof item === "object") {
      for (const [key, value] of Object.entries(item)) {
        if (value) {
          classes.push(key);
        }
      }
    }
  }

  for (const input of inputs) {
    process(input);
  }

  return classes.join(" ");
}
