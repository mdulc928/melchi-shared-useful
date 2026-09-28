import type { Snippet } from 'svelte';

/**
 * Configuration for toast notifications.
 */
type ToastConfig = {
	/**
	 * The text message to display in the toast.
	 */
	message?: string;
	/**
	 * The type of toast to display, which can be 'success', 'error', 'info', or 'warning'.
	 */
	type: 'success' | 'error' | 'info' | 'warning';
	/**
	 * Optional content to display in the toast.
	 */
	content?: Snippet<[]>;
};

/**
 * Holds the current toast configuration or `undefined` if no toast is displayed.
 */
let toastConfig = $state<ToastConfig | undefined>(undefined);

/**
 * Retrieves the currently displayed toast configuration.
 */
export function getToastConfig() {
	return toastConfig;
}

/**
 * Shows a toast message with a specified type and duration.
 * @param duration The number of milliseconds the toast remains visible. Defaults to 5000ms.
 * @param config   Contains the toast message and type.
 */
export function toast({ duration = 5000, ...config }: ToastConfig & { duration?: number }) {
	toastConfig = config;

	setTimeout(() => {
		toastConfig = undefined;
	}, duration);
}

/**
 * Dismisses the currently displayed toast.
 */
export function dismissToast() {
	toastConfig = undefined;
}
