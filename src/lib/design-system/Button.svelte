<script lang="ts">
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import { cc } from '$lib/utils';

	type Variant =
		| 'primary'
		| 'secondary'
		| 'destructive'
		| 'success'
		| 'indigo'
		| 'purple'
		| 'ghost';
	type Size = 'sm' | 'md' | 'lg' | 'icon';

	let {
		variant = 'primary',
		size = 'md',
		buttonRef = $bindable<HTMLButtonElement>(),
		class: className = '',
		children,
		disabled,
		outline = false,
		text = false,
		...rest
	}: HTMLButtonAttributes & {
		variant?: Variant;
		size?: Size;
		buttonRef?: HTMLButtonElement;
		outline?: boolean;
		text?: boolean;
	} = $props();

	const baseStyles =
		'rounded-xl font-medium transition inline-flex items-center justify-center shadow-2xs';

	const variants: Record<Variant, string> = {
		primary:
			'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-600/75 disabled:text-white/75 disabled:cursor-not-allowed disabled:pointer-events-none disabled:shadow-none disabled:hover:bg-blue-600/750',
		secondary:
			'bg-gray-200 text-fg hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600 disabled:bg-gray-200/75 disabled:text-fg/75 disabled:cursor-not-allowed disabled:pointer-events-none disabled:shadow-none disabled:hover:bg-gray-200/75',
		destructive:
			'bg-red-600 text-white hover:bg-red-700 dark:bg-red-600/80 dark:hover:bg-red-600/90 disabled:bg-red-600/75 disabled:text-white/75 disabled:cursor-not-allowed disabled:pointer-events-none disabled:shadow-none disabled:hover:bg-red-600/75',
		success:
			'bg-green-600 text-white hover:bg-green-700 dark:bg-green-600/80 dark:hover:bg-green-600/90 disabled:bg-green-600/75 disabled:text-white/75 disabled:cursor-not-allowed disabled:pointer-events-none disabled:shadow-none disabled:hover:bg-green-600/75',
		indigo:
			'bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-indigo-600/75 disabled:text-white/75 disabled:cursor-not-allowed disabled:pointer-events-none disabled:shadow-none disabled:hover:bg-indigo-600/75',
		purple:
			'bg-purple-600 text-white hover:bg-purple-700 disabled:bg-purple-600/75 disabled:text-white/75 disabled:cursor-not-allowed disabled:pointer-events-none disabled:shadow-none disabled:hover:bg-purple-600/75',
		ghost:
			'bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:pointer-events-none'
	};

	const outlineVariants: Record<Variant, string> = {
		primary:
			'border border-blue-600 text-blue-600 bg-transparent hover:bg-blue-50 dark:border-blue-500 dark:text-blue-500 dark:hover:bg-blue-950/30 disabled:border-blue-600/75 disabled:text-blue-600/75 disabled:hover:bg-transparent disabled:cursor-not-allowed disabled:pointer-events-none disabled:shadow-none',
		secondary:
			'border border-gray-200 text-fg hover:bg-gray-100 dark:border-gray-700 dark:text-gray-100 dark:hover:bg-gray-800 disabled:border-gray-200/75 disabled:text-fg/75 disabled:hover:bg-transparent disabled:cursor-not-allowed disabled:pointer-events-none disabled:shadow-none',
		destructive:
			'border border-red-600 text-red-600 bg-transparent hover:bg-red-50 dark:border-red-500 dark:text-red-500 dark:hover:bg-red-950/30 disabled:border-red-600/75 disabled:text-red-600/75 disabled:hover:bg-transparent disabled:cursor-not-allowed disabled:pointer-events-none disabled:shadow-none',
		success:
			'border border-green-600 text-green-600 bg-transparent hover:bg-green-50 dark:border-green-500 dark:text-green-500 dark:hover:bg-green-950/30 disabled:border-green-600/75 disabled:text-green-600/75 disabled:hover:bg-transparent disabled:cursor-not-allowed disabled:pointer-events-none disabled:shadow-none',
		indigo:
			'border border-indigo-600 text-indigo-600 bg-transparent hover:bg-indigo-50 dark:border-indigo-500 dark:text-indigo-500 dark:hover:bg-indigo-950/30 disabled:border-indigo-600/75 disabled:text-indigo-600/75 disabled:hover:bg-transparent disabled:cursor-not-allowed disabled:pointer-events-none disabled:shadow-none',
		purple:
			'border border-purple-600 text-purple-600 bg-transparent hover:bg-purple-50 dark:border-purple-500 dark:text-purple-500 dark:hover:bg-purple-950/30 disabled:border-purple-600/75 disabled:text-purple-600/75 disabled:hover:bg-transparent disabled:cursor-not-allowed disabled:pointer-events-none disabled:shadow-none',
		ghost:
			'border border-gray-200 text-gray-700 bg-transparent hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 disabled:opacity-75 disabled:cursor-not-allowed disabled:pointer-events-none'
	};

	const textVariants: Record<Variant, string> = {
		primary:
			'text-blue-600 bg-transparent hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/30 disabled:text-blue-600/75 disabled:hover:bg-transparent disabled:cursor-not-allowed disabled:pointer-events-none disabled:shadow-none',
		secondary:
			'text-fg hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-800 disabled:text-fg/75 disabled:hover:bg-transparent disabled:cursor-not-allowed disabled:pointer-events-none disabled:shadow-none',
		destructive:
			'text-red-600 bg-transparent hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30 disabled:text-red-600/75 disabled:hover:bg-transparent disabled:cursor-not-allowed disabled:pointer-events-none disabled:shadow-none',
		success:
			'text-green-600 bg-transparent hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950/30 disabled:text-green-600/75 disabled:hover:bg-transparent disabled:cursor-not-allowed disabled:pointer-events-none disabled:shadow-none',
		indigo:
			'text-indigo-600 bg-transparent hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/30 disabled:text-indigo-600/75 disabled:hover:bg-transparent disabled:cursor-not-allowed disabled:pointer-events-none disabled:shadow-none',
		purple:
			'text-purple-600 bg-transparent hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-950/30 disabled:text-purple-600/75 disabled:hover:bg-transparent disabled:cursor-not-allowed disabled:pointer-events-none disabled:shadow-none',
		ghost:
			'text-gray-700 bg-transparent hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 disabled:opacity-75 disabled:cursor-not-allowed disabled:pointer-events-none'
	};

	const sizes: Record<Size, string> = {
		sm: 'px-3 py-1 text-sm',
		md: 'px-3 py-2 text-sm',
		lg: 'px-4 py-2 text-lg',
		icon: 'p-2'
	};
</script>

<button
	bind:this={buttonRef}
	class={cc(
		baseStyles,
		outline ? outlineVariants[variant] : text ? textVariants[variant] : variants[variant],
		sizes[size],
		className
	)}
	{disabled}
	{...rest}
>
	{@render children?.()}
</button>
