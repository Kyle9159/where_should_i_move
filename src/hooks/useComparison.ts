"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "nexthome_compare";
const MAX_CITIES = 4;

export interface CompareEntry {
	id: string;
	slug: string;
	name: string;
	stateId: string;
}

export function useComparison() {
	const [cities, setCities] = useState<CompareEntry[]>([]);

	// Load from localStorage on mount
	useEffect(() => {
		if (typeof window === "undefined") return;
		try {
			const stored = localStorage.getItem(STORAGE_KEY);
			if (stored) setCities(JSON.parse(stored) as CompareEntry[]);
		} catch {
			// ignore
		}
	}, []);

	// Persist to localStorage whenever cities changes
	useEffect(() => {
		if (typeof window === "undefined") return;
		localStorage.setItem(STORAGE_KEY, JSON.stringify(cities));
	}, [cities]);

	const add = useCallback((entry: CompareEntry) => {
		setCities((prev) => {
			if (prev.length >= MAX_CITIES) return prev;
			if (prev.some((c) => c.id === entry.id)) return prev;
			return [...prev, entry];
		});
	}, []);

	const remove = useCallback((id: string) => {
		setCities((prev) => prev.filter((c) => c.id !== id));
	}, []);

	const toggle = useCallback((entry: CompareEntry) => {
		setCities((prev) => {
			if (prev.some((c) => c.id === entry.id)) {
				return prev.filter((c) => c.id !== entry.id);
			}
			if (prev.length >= MAX_CITIES) return prev;
			return [...prev, entry];
		});
	}, []);

	const clear = useCallback(() => setCities([]), []);

	const has = useCallback((id: string) => cities.some((c) => c.id === id), [cities]);

	return { cities, add, remove, toggle, clear, has, count: cities.length, isFull: cities.length >= MAX_CITIES };
}
