"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import RequireUser from "@/components/RequireUser";
import PortalLayout from "@/components/PortalLayout";
import { useAuth, useTheme } from "@/components/providers/AppProviders";
import EmptyState from "@/components/ui/EmptyState";
import LoadingState from "@/components/ui/LoadingState";
import PageHeading from "@/components/ui/PageHeading";
import Pagination from "@/components/ui/Pagination";
import Panel from "@/components/ui/Panel";
import ReportCard from "@/components/ui/ReportCard";
import Alert from "@/components/ui/Alert";
import {
	apiRequest,
	toQueryString,
	type ApiEnvelope,
	type Category,
	type PaginationMeta,
	type Report,
} from "@/lib/backend";

type ListConfig = {
	title: string;
	description: string;
	endpoint: "reports/public" | "reports/my";
	requireCitizen?: boolean;
};

export default function ReportListPage(config: ListConfig) {
	const params = useSearchParams();
	const searchParam = params.get("search") ?? "";

	// `key` membuat komponen di-remount saat kata kunci URL berubah, sehingga
	// pencarian dari Header ikut terpakai tanpa setState di dalam effect.
	return (
		<ReportListContent key={searchParam} {...config} initialSearch={searchParam} />
	);
}

function ReportListContent({
	title,
	description,
	endpoint,
	requireCitizen = false,
	initialSearch,
}: ListConfig & { initialSearch: string }) {
	const { isLightTheme } = useTheme();
	const { user } = useAuth();
	const [categories, setCategories] = useState<Category[]>([]);
	const [reports, setReports] = useState<Report[]>([]);
	const [meta, setMeta] = useState<PaginationMeta | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState("");
	const [search, setSearch] = useState(initialSearch);
	const [appliedSearch, setAppliedSearch] = useState(initialSearch);
	const [categoryId, setCategoryId] = useState("");
	const [status, setStatus] = useState("");
	const [priority, setPriority] = useState("");
	const [page, setPage] = useState(1);

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
		// Endpoint "reports/my" butuh sesi; tunggu auth siap agar tidak 401.
		if (endpoint === "reports/my" && !user) return;
		const controller = new AbortController();
		const query = toQueryString({
			search: appliedSearch,
			category_id: categoryId,
			status,
			priority,
			per_page: 10,
			page,
		});
		apiRequest<Report[]>(`${endpoint}?${query}`, {
			signal: controller.signal,
		})
			.then((response: ApiEnvelope<Report[]>) => {
				if (!response.meta) {
					throw new Error("Respons daftar laporan tidak menyertakan pagination.");
				}
				setReports(response.data);
				setMeta(response.meta);
				setError("");
			})
			.catch((cause: unknown) => {
				if (!controller.signal.aborted)
					setError(
						cause instanceof Error
							? cause.message
							: "Daftar laporan gagal dimuat.",
					);
			})
			.finally(() => {
				if (!controller.signal.aborted) setIsLoading(false);
			});
		return () => controller.abort();
	}, [appliedSearch, categoryId, endpoint, page, status, priority, user]);

	function handleSearch(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setIsLoading(true);
		setError("");
		setPage(1);
		setAppliedSearch(search.trim());
	}

	function changeFilter(setter: (value: string) => void, value: string) {
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

	const content = (
		<PortalLayout title={title}>
			<PageHeading
				eyebrow={requireCitizen ? "Ruang warga" : "Informasi publik"}
				title={title}
				description={description}
				actions={
					requireCitizen ? (
						<Link
							href="/reports/new"
							className="rounded-lg bg-indigo-500 px-4 py-2.5 text-xs font-semibold text-white hover:bg-indigo-600"
						>
							Buat laporan
						</Link>
					) : undefined
				}
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
						aria-label="Cari laporan berdasarkan judul"
						className={`rounded-lg border px-3 py-2 text-xs outline-none focus:border-indigo-400 sm:col-span-2 xl:col-span-1 ${
							isLightTheme
								? "border-slate-200 bg-white"
								: "border-white/10 bg-slate-950/40"
						}`}
					/>
					<select
						value={categoryId}
						onChange={(event) =>
							changeFilter(setCategoryId, event.target.value)
						}
						aria-label="Filter kategori"
						className={`rounded-lg border px-3 py-2 text-xs outline-none ${
							isLightTheme
								? "border-slate-200 bg-white"
								: "border-white/10 bg-slate-950/40"
						}`}
					>
						<option value="">Semua kategori</option>
						{categories.map((category) => (
							<option key={category.id} value={category.id}>
								{category.name}
							</option>
						))}
					</select>
					<select
						value={status}
						onChange={(event) => changeFilter(setStatus, event.target.value)}
						aria-label="Filter status"
						className={`rounded-lg border px-3 py-2 text-xs outline-none ${
							isLightTheme
								? "border-slate-200 bg-white"
								: "border-white/10 bg-slate-950/40"
						}`}
					>
						<option value="">Semua status</option>
						{[
							["verified", "Terverifikasi"],
							["followed_up", "Ditindaklanjuti"],
							...(requireCitizen
								? [
										["pending", "Menunggu"],
										["rejected", "Ditolak"],
									]
								: []),
						].map(([value, label]) => (
							<option key={value} value={value}>
								{label}
							</option>
						))}
					</select>
					<div className="flex gap-2">
						<select
							value={priority}
							onChange={(event) =>
								changeFilter(setPriority, event.target.value)
							}
							aria-label="Filter prioritas"
							className={`min-w-0 flex-1 rounded-lg border px-3 py-2 text-xs outline-none ${
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
					<LoadingState label="Memuat laporan..." />
				) : error ? null : reports.length === 0 ? (
					<EmptyState
						title="Laporan tidak ditemukan"
						description={
							requireCitizen
								? "Belum ada laporan yang cocok. Buat laporan baru atau ubah filter pencarian."
								: "Belum ada laporan publik yang cocok dengan filter ini."
						}
						actionHref={requireCitizen ? "/reports/new" : undefined}
						actionLabel={requireCitizen ? "Buat laporan" : undefined}
					/>
				) : (
					<div className="space-y-3 p-4">
						{reports.map((report) => (
							<ReportCard key={report.id} report={report} />
						))}
					</div>
				)}
				{meta && !isLoading && !error && meta.last_page > 1 && (
					<Pagination meta={meta} onPageChange={changePage} />
				)}
			</Panel>
		</PortalLayout>
	);

	if (requireCitizen) {
		return <RequireUser roles={["citizen"]}>{content}</RequireUser>;
	}
	return content;
}
