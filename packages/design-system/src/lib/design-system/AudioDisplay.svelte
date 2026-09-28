<script lang="ts">
	let { audioSrc }: { audioSrc: string } = $props();
</script>

<audio controls src={audioSrc}></audio>
