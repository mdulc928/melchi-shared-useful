import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cc(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function isDefined<T>(value: T): value is NonNullable<T> {
	return value !== null && value !== undefined;
}
