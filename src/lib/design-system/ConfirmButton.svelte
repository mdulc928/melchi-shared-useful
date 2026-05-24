<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import { onDestroy } from 'svelte';

	let {
		onConfirm,
		label = 'Confirm',
		confirmFormat = (count) => `Confirm (${count}s)`,
		variant = 'secondary',
		size = 'sm',
		disabled = false,
		class: className = '',
		startCountdown = 7
	}: {
		onConfirm: () => void;
		label?: string;
		confirmFormat?: (count: number) => string;
		variant?: 'primary' | 'secondary' | 'destructive' | 'success' | 'indigo' | 'purple' | 'ghost';
		size?: 'sm' | 'md' | 'lg' | 'icon';
		disabled?: boolean;
		class?: string;
		startCountdown?: number;
	} = $props();

	let isConfirming = $state(false);
	// svelte-ignore state_referenced_locally
	let countdown = $state(startCountdown);
	let timer: ReturnType<typeof setInterval> | undefined;

	function handleClick() {
		if (isConfirming) {
			clearTimer();
			onConfirm();
			isConfirming = false;
		} else {
			startTimer();
		}
	}

	function startTimer() {
		isConfirming = true;
		countdown = startCountdown;
		timer = setInterval(() => {
			countdown -= 1;
			if (countdown <= 0) {
				reset();
			}
		}, 1000);
	}

	function clearTimer() {
		if (timer) {
			clearInterval(timer);
			timer = undefined;
		}
	}

	function reset() {
		clearTimer();
		isConfirming = false;
		countdown = startCountdown;
	}

	onDestroy(() => {
		clearTimer();
	});
</script>

<Button
	{variant}
	{size}
	{disabled}
	class={className}
	onclick={handleClick}
	aria-label={isConfirming ? 'Confirm Action' : label}
>
	{isConfirming ? confirmFormat(countdown) : label}
</Button>
