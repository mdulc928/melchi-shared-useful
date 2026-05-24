/**
 * Portable Elements Module
 *
 * This file implements a "portability" system that interacts with the Floating Action Button (FAB).
 * Its primary purpose is to allow UI components to detect when they have scrolled out of the viewport.
 *
 * When a "Portable" component becomes invisible (scrolls off-screen), this system:
 * 1. Registers the component's content in a central store (`portedElements`).
 * 2. Signals the FAB to display an icon representing that component.
 * 3. Allows the FAB to "portal" the component's DOM node into a drawer or popover when clicked.
 *
 * This pattern ensures critical tools remain accessible to the user at all times without
 * permanently cluttering the screen with fixed-position elements.
 */

import { SvelteMap } from 'svelte/reactivity';
import type { Component } from 'svelte';

/** Defines the structure of an item that can be ported to the FAB. */
export type PortedItem = {
	element: HTMLElement;
	metadata: {
		/** Icon to display in the FAB/Popover. */
		icon: Component;
		/** Label for tooltips and lists. */
		label: string;
	};
};

/** Registry of currently invisible items available in the FAB. */
const portedElements = new SvelteMap<string, PortedItem>();

/** Returns the map of currently ported elements. */
export function getPortedElements() {
	return portedElements;
}

/** Registers a component as "ported" (invisible and available in FAB). */
export function addToPortedElements(
	key: string,
	element: HTMLElement,
	metadata: PortedItem['metadata']
) {
	portedElements.set(key, { element, metadata });
	return key;
}

/** Unregisters a component (it has become visible again). */
export function removeFromPortedElement(key: string) {
	portedElements.delete(key);
}

/**
 * Registry of elements currently active in the FAB Drawer.
 * Note: Currently, we only keep one element in the dock at a time.
 */
const dockElements = new SvelteMap<string, HTMLElement>();

/** Assigns an element to a specific dock slot (e.g., inside the open Drawer). */
export function addToDockPort(key: string, element: HTMLElement) {
	dockElements.set(key, element);
	return key;
}

/** Clears all elements from the dock. */
export function clearDockElements() {
	dockElements.clear();
}

/**
 * Class to manage a component's portability state.
 *
 * Handles the IntersectionObserver setup and automatically acts as the bridge
 * between the component's local state and the global portability stores.
 */
export class Portable {
	key: string;
	metadata: PortedItem['metadata'];

	// State for binding
	wrapper = $state<HTMLElement | null>(null);
	content = $state<HTMLElement | null>(null);

	// Internal state
	isIntersecting = $state(true);

	constructor(key: string, metadata: PortedItem['metadata'], options?: { alwaysPorted?: boolean }) {
		this.key = key;
		this.metadata = metadata;

		if (options?.alwaysPorted) {
			this.isIntersecting = false;
		}

		// Intersection Observer Effect
		$effect(() => {
			if (!this.wrapper || options?.alwaysPorted) return;

			const observer = new IntersectionObserver(
				(entries) => {
					this.isIntersecting = entries[0].isIntersecting;
				},
				{ threshold: 0 }
			);

			observer.observe(this.wrapper);
			return () => observer.disconnect();
		});

		// Porting Logic Effect
		$effect.pre(() => {
			if (!this.isIntersecting && this.content) {
				addToPortedElements(this.key, this.content, this.metadata);
			} else {
				removeFromPortedElement(this.key);
			}

			return () => {
				removeFromPortedElement(this.key);
			};
		});
	}

	/**
	 * Determines where the content should be rendered.
	 * Returns the Dock target if the item is invisible (ported), otherwise returns the local wrapper.
	 */
	get target() {
		const target = dockElements.get(this.key);
		if (!this.isIntersecting && target) {
			return target;
		}
		return this.wrapper;
	}
}
