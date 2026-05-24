<script lang="ts">
	import { cc } from '$lib/utils';

	interface Props {
		size?: 'sm' | 'md' | 'lg';
		text?: string;
		class?: string;
	}

	let { size = 'md', text, class: className }: Props = $props();

	const sizeClasses = {
		sm: 'h-4 w-4 border-2',
		md: 'h-8 w-8 border-4',
		lg: 'h-12 w-12 border-4'
	};
</script>

<div class={cc('flex flex-1 flex-col items-center justify-center gap-2', className)}>
	<div
		class={cc('animate-spin rounded-full border-primary border-t-transparent', sizeClasses[size])}
	></div>
	{#if text}
		<p class="text-muted-foreground text-sm">{text}</p>
	{/if}
</div>
