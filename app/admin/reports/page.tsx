"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import RequireUser from "@/components/RequireUser";
import PortalLayout from "@/components/PortalLayout";
import { useAuth, useTheme } from "@/components/providers/AppProviders";
import Alert from "@/components/ui/Alert";
import EmptyState from "@/components/ui/EmptyState";
import LoadingState from "@/components/ui/LoadingState";
import PageHeading from "@/components/ui/PageHeading";
import Pagination from "@/components/ui/Pagination";
import Panel from "@/components/ui/Panel";
import StatusBadge from "@/components/ui/StatusBadge";
import {
	apiRequest,
	toQueryString,
	type ApiEnvelope,
	type Category,
	type PaginationMeta,
	type Report,
} from "@/lib/backend";

export default function AdminReportsPage() {
	const [reports, setReports] = useState<Report[]>([]);
	const [categories, setCategories] = useState<Category[]>([]);
	const [meta, setMeta] = useState<PaginationMeta | null>(null);
	const [search, setSearch] = useState("");
	const [appliedSearch, setAppliedSearch] = useState("");
	const [categoryId, setCategoryId] = useState("");
	const [status, setStatus] = useState("pending");
	const [priority, setPriority] = useState("");
	const [page, setPage] = useState(1);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState("");
	const { isLightTheme } = useTheme();
	const { user } = useAuth();

	useEffect(() => {
		apiRequest<Category[]>("categories")
			.then((response) => setCategories(response.data))
			.catch((cause: unknown) =>
				setError(
					cause instanceof Error
						? cause.message
						: "Kategori laporan gagal dimuat.",
				),
			);
	}, []);

	useEffect(() => {
		// Antrean hanya untuk petugas; tunggu sesi siap agar tidak memicu 401/403
		// palsu sebelum RequireUser melakukan pengecekan.
		if (!user || user.role === "citizen") return;
		const controller = new AbortController();
		const query = toQueryString({
			search: appliedSearch,
			category_id: categoryId,
			status,
			priority,
			per_page: 15,
			page,
		});
		apiRequest<Report[]>(`admin/reports?${query}`, {
			signal: controller.signal,
		})
			.then((response: ApiEnvelope<Report[]>) => {
				if (!response.meta)
					throw new Error("Respons antrean tidak menyertakan pagination.");
				setReports(response.data);
				setMeta(response.meta);
				setError("");
			})
			.catch((cause: unknown) => {
				if (!controller.signal.aborted)
					setError(
						cause instanceof Error
							? cause.message
							: "Antrean laporan gagal dimuat.",
					);
			})
			.finally(() => {
				if (!controller.signal.aborted) setIsLoading(false);
			});
		return () => controller.abort();
	}, [appliedSearch, categoryId, page, priority, status, user]);

	function handleSearch(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const nextSearch = search.trim();
		if (nextSearch === appliedSearch && page === 1) return;
		setIsLoading(true);
		setError("");
		setPage(1);
		setAppliedSearch(nextSearch);
	}

	function handleFilter(
		setter: (value: string) => void,
		value: string,
	) {
		setIsLoading(true);
		setError("");
		setPage(1);
		setter(value);
	}

	function changePage(nextPage: number) {
		setIsLoading(true);
		setError("");
		setPage(nextPage);
	}

	return (
		<RequireUser roles={["verifier_admin", "agency_admin"]}>
			<PortalLayout title="Antrean laporan">
				<PageHeading
					eyebrow="Ruang kerja petugas"
					title="Antrean laporan"
					description="Filter laporan berdasarkan status, kategori, dan prioritas. Urutan prioritas ditentukan backend."
				/>
				<Panel className="p-0">
					<form
						onSubmit={handleSearch}
						className={`grid gap-3 border-b p-4 sm:grid-cols-2 xl:grid-cols-4 ${
							isLightTheme ? "border-slate-100" : "border-white/[0.06]"
						}`}
					>
						<input
							type="search"
							value={search}
							onChange={(event) => setSearch(event.target.value)}
							placeholder="Cari judul laporan..."
							aria-label="Cari judul laporan"
							className={`rounded-lg border px-3 py-2 text-xs outline-none focus:border-indigo-400 sm:col-span-2 xl:col-span-1 ${
								isLightTheme
									? "border-slate-200 bg-white"
									: "border-white/10 bg-slate-950/40"
							}`}
						/>
						<select
							value={status}
							onChange={(event) =>
								handleFilter(setStatus, event.target.value)
							}
							aria-label="Filter status laporan"
							className={`rounded-lg border px-3 py-2 text-xs ${
								isLightTheme
									? "border-slate-200 bg-white"
									: "border-white/10 bg-slate-950/40"
							}`}
						>
							{[
								["", "Semua status"],
								["pending", "Menunggu"],
								["verified", "Terverifikasi"],
								["followed_up", "Ditindaklanjuti"],
								["rejected", "Ditolak"],
							].map(([value, label]) => (
								<option key={value || "all"} value={value}>{label}</option>
							))}
						</select>
						<select
							value={categoryId}
							onChange={(event) =>
								handleFilter(setCategoryId, event.target.value)
							}
							aria-label="Filter kategori laporan"
							className={`rounded-lg border px-3 py-2 text-xs ${
								isLightTheme
									? "border-slate-200 bg-white"
									: "border-white/10 bg-slate-950/40"
							}`}
						>
							<option value="">Semua kategori</option>
							{categories.map((category) => (
								<option key={category.id} value={category.id}>{category.name}</option>
							))}
						</select>
						<div className="flex gap-2">
							<select
								value={priority}
								onChange={(event) =>
									handleFilter(setPriority, event.target.value)
								}
								aria-label="Filter prioritas laporan"
								className={`min-w-0 flex-1 rounded-lg border px-3 py-2 text-xs ${
									isLightTheme
										? "border-slate-200 bg-white"
										: "border-white/10 bg-slate-950/40"
								}`}
							>
								<option value="">Semua prioritas</option>
								{["darurat", "tinggi", "sedang", "rendah"].map((value) => (
									<option key={value} value={value}>
										{value.charAt(0).toUpperCase() + value.slice(1)}
									</option>
								))}
							</select>
							<button
								type="submit"
								className="rounded-lg bg-indigo-500 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-600"
							>
								Cari
							</button>
						</div>
					</form>

					{error && <div className="p-4"><Alert message={error} /></div>}
					{isLoading ? (
						<LoadingState label="Memuat antrean laporan..." />
					) : error ? null : reports.length === 0 ? (
						<EmptyState
							title="Tidak ada laporan di antrean ini"
							description="Ubah filter status atau kata kunci untuk melihat laporan lainnya."
						/>
					) : (
						<div className="overflow-x-auto">
							<table className="w-full min-w-[820px] text-left">
								<thead className={`text-[10px] uppercase tracking-wider ${
									isLightTheme ? "bg-slate-50 text-slate-500" : "bg-white/[0.02] text-slate-500"
								}`}>
									<tr>
										<th className="px-4 py-3 font-semibold">Laporan</th>
										<th className="px-3 py-3 font-semibold">Kategori AI</th>
										<th className="px-3 py-3 font-semibold">Prioritas</th>
										<th className="px-3 py-3 font-semibold">Confidence</th>
										<th className="px-3 py-3 font-semibold">Status</th>
										<th className="px-4 py-3 text-right font-semibold">Detail</th>
									</tr>
								</thead>
								<tbody className={isLightTheme ? "divide-y divide-slate-100" : "divide-y divide-white/[0.05]"}>
									{reports.map((report) => (
										<tr key={report.id} className={isLightTheme ? "hover:bg-slate-50/70" : "hover:bg-white/[0.02]"}>
											<td className="px-4 py-3.5">
												<p className="text-[10px] font-semibold text-indigo-500">{report.ticket_number}</p>
												<p className="mt-1 max-w-sm truncate text-xs font-medium">{report.title}</p>
												<p className="mt-1 text-[10px] text-slate-500">
													{report.reporter_name ?? "Tidak tersedia"} · {report.location_text}
												</p>
											</td>
											<td className="px-3 py-3.5 text-xs">
												<p>{report.ai_analysis.predicted_category_name ?? "Belum tersedia"}</p>
												{report.ai_analysis.is_corrected && (
													<span className="mt-1 inline-block text-[9px] font-semibold text-amber-600">
														Dikoreksi petugas
													</span>
												)}
											</td>
											<td className="px-3 py-3.5">
												<StatusBadge status={report.priority} label={report.priority_label} kind="priority" />
											</td>
											<td className="px-3 py-3.5 text-xs font-medium">
												{report.ai_analysis.confidence === null
													? "—"
													: `${Math.round(report.ai_analysis.confidence * 100)}%`}
											</td>
											<td className="px-3 py-3.5">
												<StatusBadge status={report.status} label={report.status_label} />
											</td>
											<td className="px-4 py-3.5 text-right">
												<Link
													href={`/admin/reports/${report.id}`}
													className="rounded-md border border-indigo-500/20 px-2.5 py-1.5 text-[10px] font-semibold text-indigo-500 hover:bg-indigo-500/10"
												>
													Tinjau
												</Link>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
					{meta && !isLoading && !error && meta.last_page > 1 && (
						<Pagination meta={meta} onPageChange={changePage} />
					)}
				</Panel>
			</PortalLayout>
		</RequireUser>
	);
}
