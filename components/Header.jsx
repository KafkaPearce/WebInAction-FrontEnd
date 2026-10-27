"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth, useTheme } from "@/components/providers/AppProviders";

function Icon({
	name,
	className = "h-4 w-4",
}) {
	const paths = {
		menu: <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />,
		search: (
			<>
				<circle cx="11" cy="11" r="7" />
				<path strokeLinecap="round" d="m20 20-4-4" />
			</>
		),
		sun: (
			<>
				<circle cx="12" cy="12" r="4" />
				<path
					strokeLinecap="round"
					d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"
				/>
			</>
		),
		moon: (
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				d="M20.5 15.5A8.5 8.5 0 0 1 8.5 3.5 8.5 8.5 0 1 0 20.5 15.5Z"
			/>
		),
		chevron: (
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				d="m6 9 6 6 6-6"
			/>
		),
		logout: (
			<>
				<path strokeLinecap="round" d="M10 17l5-5-5-5m5 5H3" />
				<path strokeLinecap="round" d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" />
			</>
		),
	};

	return (
		<svg
			className={className}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.8"
			aria-hidden="true"
		>
			{paths[name]}
		</svg>
	);
}

export default function Header({
	title = "Portal Aduan",
	onMenuClick = () => {},
	showMenuButton = false,
}) {
	const { user, logout } = useAuth();
	const { isLightTheme, toggleTheme } = useTheme();
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const [search, setSearch] = useState("");
	const [logoutError, setLogoutError] = useState("");
	const router = useRouter();
	const displayName = user?.name ?? "Pengunjung";
	const initial = displayName.trim().charAt(0).toUpperCase() || "P";

	function handleSearch(event) {
		event.preventDefault();
		const query = search.trim();
		router.push(query ? `/reports?search=${encodeURIComponent(query)}` : "/reports");
		setSearch("");
	}

	async function handleLogout(redirectTo) {
		setLogoutError("");
		try {
			await logout(redirectTo);
		} catch (cause) {
			setLogoutError(
				cause instanceof Error
					? cause.message
					: "Tidak dapat keluar. Silakan coba lagi.",
			);
		}
	}

	return (
		<header
			className={`sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b px-4 sm:px-6 ${
				isLightTheme
					? "border-slate-200 bg-white/95 text-slate-900 backdrop-blur"
					: "border-white/[0.06] bg-[#0b1120]/95 text-slate-100 backdrop-blur"
			}`}
		>
			<div className="flex min-w-0 items-center gap-3">
				{showMenuButton && (
					<button
						type="button"
						onClick={onMenuClick}
						aria-label="Buka navigasi"
						className={`rounded-lg p-2 lg:hidden ${
							isLightTheme
								? "text-slate-500 hover:bg-slate-100"
								: "text-slate-400 hover:bg-white/5"
						}`}
					>
						<Icon name="menu" className="h-5 w-5" />
					</button>
				)}
				<div className="min-w-0">
					<p
						className={`hidden text-[10px] font-semibold uppercase tracking-[0.16em] sm:block ${
							isLightTheme ? "text-slate-400" : "text-slate-500"
						}`}
					>
						Disposisi Aduan Publik
					</p>
					<h1 className="truncate text-sm font-semibold sm:text-base">{title}</h1>
				</div>
			</div>

			<div className="flex shrink-0 items-center gap-2 sm:gap-3">
				<form
					onSubmit={handleSearch}
					className={`hidden items-center gap-2 rounded-lg border px-3 py-2 md:flex ${
						isLightTheme
							? "border-slate-200 bg-slate-50 focus-within:border-indigo-400"
							: "border-white/10 bg-white/[0.03] focus-within:border-indigo-400/50"
					}`}
				>
					<Icon
						name="search"
						className={`h-4 w-4 ${
							isLightTheme ? "text-slate-400" : "text-slate-500"
						}`}
					/>
					<input
						value={search}
						onChange={(event) => setSearch(event.target.value)}
						aria-label="Cari laporan"
						placeholder="Cari laporan..."
						className={`w-36 bg-transparent text-xs outline-none lg:w-48 ${
							isLightTheme
								? "text-slate-900 placeholder:text-slate-400"
								: "text-slate-100 placeholder:text-slate-500"
						}`}
					/>
				</form>

				<button
					type="button"
					onClick={toggleTheme}
					aria-label={`Aktifkan tema ${isLightTheme ? "gelap" : "terang"}`}
					className={`rounded-lg p-2 transition ${
						isLightTheme
							? "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
							: "text-slate-400 hover:bg-white/5 hover:text-white"
					}`}
				>
					<Icon name={isLightTheme ? "moon" : "sun"} className="h-5 w-5" />
				</button>

				<div className="relative">
					<button
						type="button"
						onClick={() => setIsMenuOpen((open) => !open)}
						aria-haspopup="menu"
						aria-expanded={isMenuOpen}
						className={`flex items-center gap-2 rounded-lg p-1.5 transition ${
							isLightTheme ? "hover:bg-slate-100" : "hover:bg-white/5"
						}`}
					>
						<span
							className={`flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold ${
								isLightTheme
									? "border-indigo-100 bg-indigo-50 text-indigo-700"
									: "border-indigo-400/20 bg-indigo-400/10 text-indigo-300"
							}`}
						>
							{initial}
						</span>
						<span className="hidden max-w-36 text-left sm:block">
							<span className="block truncate text-xs font-semibold">{displayName}</span>
							<span
								className={`block text-[10px] ${
									isLightTheme ? "text-slate-500" : "text-slate-500"
								}`}
							>
								{user?.role_label ?? "Akun publik"}
							</span>
						</span>
						<Icon
							name="chevron"
							className={`hidden h-4 w-4 transition sm:block ${
								isMenuOpen ? "rotate-180" : ""
							} ${isLightTheme ? "text-slate-400" : "text-slate-500"}`}
						/>
					</button>

					{isMenuOpen && (
						<>
							<button
								type="button"
								aria-label="Tutup menu akun"
								onClick={() => setIsMenuOpen(false)}
								className="fixed inset-0 z-30 cursor-default"
							/>
							<div
								role="menu"
								className={`absolute right-0 top-full z-40 mt-2 w-64 rounded-xl border p-2 shadow-xl ${
									isLightTheme
										? "border-slate-200 bg-white text-slate-900 shadow-slate-900/10"
										: "border-white/10 bg-slate-900 text-slate-100 shadow-black/30"
								}`}
							>
								{user ? (
									<>
										<div
											className={`border-b px-3 py-2 ${
												isLightTheme ? "border-slate-100" : "border-white/[0.06]"
											}`}
										>
											<p className="truncate text-xs font-semibold">{user.name}</p>
											<p className="truncate text-[10px] text-slate-500">
												{user.email}
											</p>
										</div>
										<Link
											href={user.role === "citizen" ? "/my-reports" : "/admin"}
											role="menuitem"
											onClick={() => setIsMenuOpen(false)}
											className={`block rounded-lg px-3 py-2 text-xs ${
												isLightTheme ? "hover:bg-slate-50" : "hover:bg-white/5"
											}`}
										>
											{user.role === "citizen" ? "Laporan saya" : "Ringkasan petugas"}
										</Link>
										<button
											type="button"
											role="menuitem"
											onClick={() => void handleLogout("/login")}
											className={`w-full rounded-lg px-3 py-2 text-left text-xs font-medium ${
												isLightTheme
													? "text-indigo-600 hover:bg-indigo-50"
													: "text-indigo-300 hover:bg-indigo-500/10"
											}`}
										>
											Ganti akun
										</button>
										<button
											type="button"
											role="menuitem"
											onClick={() => void handleLogout("/")}
											className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-rose-500 hover:bg-rose-500/10"
										>
											<Icon name="logout" />
											Keluar
										</button>
										{logoutError && (
											<p role="alert" className="px-3 py-2 text-[11px] text-rose-500">
												{logoutError}
											</p>
										)}
									</>
								) : (
									<>
										<Link
											href="/login"
											role="menuitem"
											onClick={() => setIsMenuOpen(false)}
											className="block rounded-lg px-3 py-2 text-xs font-medium text-indigo-500 hover:bg-indigo-500/10"
										>
											Masuk
										</Link>
										<Link
											href="/register"
											role="menuitem"
											onClick={() => setIsMenuOpen(false)}
											className={`block rounded-lg px-3 py-2 text-xs ${
												isLightTheme ? "hover:bg-slate-50" : "hover:bg-white/5"
											}`}
										>
											Buat akun warga
										</Link>
									</>
								)}
							</div>
						</>
					)}
				</div>
			</div>
		</header>
	);
}
