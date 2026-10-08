import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

// Convert BigInt values to numbers/strings for safe JSON serialization
// PostgreSQL returns BigInt for count/aggregate operations which Next.js RSC
// cannot serialize via JSON.stringify.
export function sanitizeData<T>(data: T): T {
    return JSON.parse(JSON.stringify(data, (_, value) =>
        typeof value === 'bigint' ? Number(value) : value
    ));
}
