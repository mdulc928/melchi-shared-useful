# Portability & FAB (Floating Action Button) System Guide

The **Portability System** is an advanced UX pattern designed to keep user interfaces clean and accessible. It allows critical UI components (like menus, profiles, or input forms) to dynamically "dock" or teleport into a global Drawer (on mobile) or Modal (on desktop) when scrolled out of view, or when programmatically triggered.

---

## Core Architecture

1. **`Portable` Class**: Manages local intersection observers, state binding, and registers elements in a global registry (`portedElements`).
2. **`Portal` Component**: A Svelte portal (`bits-ui`) that teleports the component's DOM elements to the active target.
3. **`FAB` Component**: Renders the floating action buttons for all active portable elements and manages the host global `<Drawer />` and docking slots.
4. **`portableState`**: A global state manager allowing programmatic opening and closing of portable elements from anywhere in the application.

---

## Usage Scenarios & Examples

### Scenario 1: Standard Viewport Detection

Dock the component to the FAB **only** when the component scrolls out of the viewport.

```svelte
<script lang="ts">
	import { Portable } from '$lib/components/ui/FAB/portable.svelte';
	import { Portal } from 'bits-ui';
	import WrenchIcon from '$lib/components/ui/icons/WrenchIcon.svelte';

	// 1. Instantiate the portable manager
	const portable = new Portable('tools-menu', {
		icon: WrenchIcon,
		label: 'Tools Menu'
	});
</script>

<!-- 2. Bind the wrapper to observe viewport intersection -->
<div bind:this={portable.wrapper}>
	{#if portable.target}
		<!-- 3. Teleport content to the active target (local wrapper or global drawer) -->
		<Portal to={portable.target}>
			<div class="contents" bind:this={portable.content}>
				<div class="rounded-xl border border-border bg-white p-4 dark:bg-gray-800">
					<h3 class="font-bold">Tools Menu</h3>
					<p>This content will seamlessly jump to the drawer when off-screen!</p>
				</div>
			</div>
		</Portal>
	{/if}
</div>
```

---

### Scenario 2: Always Ported (Hidden Locally)

Perfect for sidebar panels (like **Profile**) that remain completely hidden in standard layout views but are always available in the FAB drawer.

```svelte
<script lang="ts">
	import { Portable } from '$lib/components/ui/FAB/portable.svelte';
	import { Portal } from 'bits-ui';
	import UserProfileIcon from '$lib/components/ui/icons/UserProfileIcon.svelte';

	const portable = new Portable(
		'profile-panel',
		{
			icon: UserProfileIcon,
			label: 'Profile Settings'
		},
		{ alwaysPorted: true } // Forces target to drawer and bypasses viewport observer
	);
</script>

<aside id="profile-sidebar" class="hidden md:block" bind:this={portable.wrapper}>
	{#if portable.target}
		<Portal to={portable.target}>
			<div class="contents" bind:this={portable.content}>
				<!-- Profile content here -->
			</div>
		</Portal>
	{/if}
</aside>
```

---

### Scenario 3: Always Ported & Hidden from FAB (Programmatic Triggers Only)

Perfect for modals or overlays (like **Signup / Login**) that are summoned programmatically via layout navigation headers or CTA click handlers, but should **never** show a floating action button on screen.

```svelte
<script lang="ts">
	import { Portable } from '$lib/components/ui/FAB/portable.svelte';
	import { Portal } from 'bits-ui';
	import UserProfileIcon from '$lib/components/ui/icons/UserProfileIcon.svelte';
	import SignupForm from './SignupForm.svelte';

	const portable = new Portable(
		'auth',
		{
			icon: UserProfileIcon,
			label: 'Sign in'
		},
		{
			alwaysPorted: true,
			hideFromFAB: true // Registers but keeps FAB clean of floating buttons
		}
	);
</script>

<div class="hidden" bind:this={portable.wrapper}>
	{#if portable.target}
		<Portal to={portable.target}>
			<div class="contents" bind:this={portable.content}>
				<SignupForm />
			</div>
		</Portal>
	{/if}
</div>
```

---

## Programmatic Controls

You can summon or dismiss any registered portable component programmatically from any component or helper in the application using the global `portableState` object:

```svelte
<script lang="ts">
	import { portableState } from '$lib/components/ui/FAB/portable.svelte';
	import { authState } from '$lib/features/auth/auth.svelte';
</script>

<!-- Summon the authentication drawer/modal in signup mode -->
<button
	onclick={() => {
		authState.mode = 'signup';
		portableState.open('auth');
	}}
>
	Join Now
</button>

<!-- Dismiss the drawer programmatically -->
<button onclick={() => portableState.close()}> Cancel </button>
```
