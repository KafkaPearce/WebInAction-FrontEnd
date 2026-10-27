"use client";

import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
	type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { ApiError, apiRequest, type User } from "@/lib/backend";

type AuthContextValue = {
	user: User | null;
	isLoading: boolean;
	error: string | null;
	refreshUser: () => Promise<User | null>;
	logout: (redirectTo?: string) => Promise<void>;
};

type ThemeContextValue = {
	theme: "dark" | "light";
	isLightTheme: boolean;
	toggleTheme: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const ThemeContext = createContext<ThemeContextValue | null>(null);

export function AppProviders({ children }: { children: ReactNode }) {
	const [user, setUser] = useState<User | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [theme, setTheme] = useState<"dark" | "light">("dark");
	const router = useRouter();

	const refreshUser = useCallback(async () => {
		try {
			const response = await apiRequest<User>("auth/me");
			setUser(response.data);
			setError(null);
			return response.data;
		} catch (cause) {
			if (cause instanceof ApiError && cause.status === 401) {
				setUser(null);
				setError(null);
				return null;
			}
			const message =
				cause instanceof Error ? cause.message : "Sesi gagal dimuat.";
			setError(message);
			throw cause;
		}
	}, []);

	useEffect(() => {
		let isMounted = true;
		apiRequest<User>("auth/me")
			.then((response) => {
				if (isMounted) {
					setUser(response.data);
					setError(null);
				}
			})
			.catch((cause: unknown) => {
				if (!isMounted) return;
				if (cause instanceof ApiError && cause.status === 401) {
					setUser(null);
					setError(null);
				} else {
					setError(
						cause instanceof Error ? cause.message : "Sesi gagal dimuat.",
					);
				}
			})
			.finally(() => {
				if (isMounted) setIsLoading(false);
			});
		return () => {
			isMounted = false;
		};
	}, []);

	useEffect(() => {
		function handleExpiredSession() {
			setUser(null);
			setError("Sesi Anda berakhir. Silakan masuk kembali.");
			const currentPath = `${window.location.pathname}${window.location.search}`;
			if (
				window.location.pathname !== "/login" &&
				window.location.pathname !== "/register"
			) {
				router.replace(`/login?next=${encodeURIComponent(currentPath)}`);
			}
		}

		window.addEventListener("mia:session-expired", handleExpiredSession);
		return () =>
			window.removeEventListener("mia:session-expired", handleExpiredSession);
	}, [router]);

	useEffect(() => {
		document.documentElement.dataset.theme = theme;
	}, [theme]);

	const logout = useCallback(async (redirectTo = "/login") => {
		if (user) {
			await apiRequest<null>("auth/logout", { method: "POST" });
		}
		setUser(null);
		setError(null);
		// Navigasi penuh (bukan router.replace) supaya RequireUser di halaman
		// terproteksi tidak sempat me-redirect ke /login?next=... lebih dulu.
		window.location.assign(redirectTo);
	}, [user]);

	const toggleTheme = useCallback(() => {
		setTheme((currentTheme) => (currentTheme === "dark" ? "light" : "dark"));
	}, []);

	const authValue = useMemo(
		() => ({ user, isLoading, error, refreshUser, logout }),
		[user, isLoading, error, refreshUser, logout],
	);
	const themeValue = useMemo(
		() => ({
			theme,
			isLightTheme: theme === "light",
			toggleTheme,
		}),
		[theme, toggleTheme],
	);

	return (
		<AuthContext.Provider value={authValue}>
			<ThemeContext.Provider value={themeValue}>
				{children}
			</ThemeContext.Provider>
		</AuthContext.Provider>
	);
}

export function useAuth() {
	const context = useContext(AuthContext);
	if (!context) throw new Error("useAuth harus digunakan di dalam AppProviders.");
	return context;
}

export function useTheme() {
	const context = useContext(ThemeContext);
	if (!context)
		throw new Error("useTheme harus digunakan di dalam AppProviders.");
	return context;
}
