"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "nexthome_compare";
const SYNC_EVENT = "nexthome_compare_sync";
const MAX_CITIES = 4;

export interface CompareEntry {
	id: string;
	slug: string;
	name: string;
	stateId: string;
}

function readStorage(): CompareEntry[] {
	if (typeof window === "undefined") return [];
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		return stored ? (JSON.parse(stored) as CompareEntry[]) : [];
	} catch {
		return [];
	}
}

function writeStorage(cities: CompareEntry[]) {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(cities));
	// Broadcast to all other useComparison instances on the same page
	window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: cities }));
}

export function useComparison() {
	const [cities, setCities] = useState<CompareEntry[]>([]);

	// Load from localStorage on mount
	useEffect(() => {
		setCities(readStorage());
	}, []);

	// Listen for same-tab sync events from other useComparison instances
	useEffect(() => {
		const handler = (e: Event) => {
			setCities((e as CustomEvent<CompareEntry[]>).detail);
		};
		window.addEventListener(SYNC_EVENT, handler);
		return () => window.removeEventListener(SYNC_EVENT, handler);
	}, []);

	const add = useCallback((entry: CompareEntry) => {
		setCities((prev) => {
			if (prev.length >= MAX_CITIES) return prev;
			if (prev.some((c) => c.id === entry.id)) return prev;
			const next = [...prev, entry];
			writeStorage(next);
			return next;
		});
	}, []);

	const remove = useCallback((id: string) => {
		setCities((prev) => {
			const next = prev.filter((c) => c.id !== id);
			writeStorage(next);
			return next;
		});
	}, []);

	const toggle = useCallback((entry: CompareEntry) => {
		setCities((prev) => {
			const next = prev.some((c) => c.id === entry.id)
				? prev.filter((c) => c.id !== entry.id)
				: prev.length >= MAX_CITIES
					? prev
					: [...prev, entry];
			writeStorage(next);
			return next;
		});
	}, []);

	const clear = useCallback(() => {
		writeStorage([]);
		setCities([]);
	}, []);

	const has = useCallback((id: string) => cities.some((c) => c.id === id), [cities]);

	return { cities, add, remove, toggle, clear, has, count: cities.length, isFull: cities.length >= MAX_CITIES };
}
