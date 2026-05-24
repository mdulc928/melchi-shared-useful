```svelte
<script>
	// Portability logic
	const portable = new Portable('tools-menu', {
		icon: WrenchIcon,
		label: 'Tools'
	});
</script>

<div bind:this={portable.wrapper}>
	{#if portable.target}
		<Portal to={portable.target}>
			<div class="contents" bind:this={portable.content}>
				<!--Regular content-->
			</div>
		</Portal>
	{/if}
</div>
```
