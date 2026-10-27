"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import RequireUser from "@/components/RequireUser";
import PortalLayout from "@/components/PortalLayout";
import { useAuth, useTheme } from "@/components/providers/AppProviders";
import Alert from "@/components/ui/Alert";
import LoadingState from "@/components/ui/LoadingState";
import PageHeading from "@/components/ui/PageHeading";
import Panel from "@/components/ui/Panel";
import StatusBadge from "@/components/ui/StatusBadge";
import { apiRequest, type DashboardStats, type Report } from "@/lib/backend";

type PriorityStat = DashboardStats["by_priority"][number];

/**
 * Sebagian respons backend mengirim `by_priority` sebagai object ber-key
 * prioritas ({"darurat": {...}}) alih-alih array. Normalisasi di sini supaya
 * render tidak gagal saat `.map()` dipanggil.
 */
function normalizePriorityStats(value: unknown): PriorityStat[] {
	if (Array.isArray(value)) return value as PriorityStat[];
	return Object.values((value as Record<string, PriorityStat> | null) ?? {});
}

export default function AdminDashboardPage() {
	const [stats, setStats] = useState<DashboardStats | null>(null);
	const [reports, setReports] = useState<Report[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState("");
	const { isLightTheme } = useTheme();
	const { user } = useAuth();

	useEffect(() => {
		// Tunggu sesi petugas siap: mencegah request 401/403 sebelum RequireUser
		// selesai memeriksa, yang tadinya memicu pesan "Sesi Anda berakhir".
		if (!user || user.role === "citizen") return;
		let isMounted = true;
		Promise.all([
			apiRequest<DashboardStats>("stats/summary"),
			apiRequest<Report[]>("admin/reports?per_page=5"),
		])
			.then(([statsResponse, reportsResponse]) => {
				if (!isMounted) return;
				const statsData = statsResponse.data;
				setStats({
					...statsData,
					by_priority: normalizePriorityStats(statsData.by_priority),
				});
				setReports(reportsResponse.data);
				setError("");
			})
			.catch((cause: unknown) => {
				if (isMounted)
					setError(
						cause instanceof Error
							? cause.message
							: "Ringkasan dashboard gagal dimuat.",
					);
			})
			.finally(() => {
				if (isMounted) setIsLoading(false);
			});
		return () => {
			isMounted = false;
		};
	}, [user]);

	const metrics = stats
		? [
				["Total laporan", stats.total_reports.toLocaleString("id-ID"), "seluruh laporan"],
				["Menunggu verifikasi", stats.pending_reports.toLocaleString("id-ID"), "perlu ditinjau"],
				["Selesai ditindaklanjuti", stats.completed_reports.toLocaleString("id-ID"), "laporan selesai"],
				["Rata-rata penyelesaian", `${stats.average_resolution_days} hari`, "dari laporan hingga tindak lanjut"],
			]
		: [];

	return (
		<RequireUser roles={["verifier_admin", "agency_admin"]}>
			<PortalLayout title="Ringkasan petugas">
				<PageHeading
					eyebrow="Pusat kendali petugas"
					title="Ringkasan laporan"
					description="Pantau antrean dan kemajuan laporan masyarakat berdasarkan data backend."
				/>
				{error && <Alert message={error} />}
				{isLoading ? (
					<Panel><LoadingState label="Memuat statistik laporan..." /></Panel>
				) : stats ? (
					<>
						<section aria-label="Statistik laporan" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
							{metrics.map(([label, value, description], index) => (
								<article
									key={label}
									className={`rounded-xl border p-4 ${
										isLightTheme
											? "border-slate-200 bg-white shadow-sm shadow-slate-200/40"
											: "border-white/[0.06] bg-[#101827]"
									}`}
								>
									<p className="text-xs font-medium text-slate-500">{label}</p>
									<p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
									<p className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-500">
										<span className={`h-1.5 w-1.5 rounded-full ${
											["bg-indigo-500", "bg-amber-500", "bg-emerald-500", "bg-sky-500"][index]
										}`} />
										{description}
									</p>
								</article>
							))}
						</section>

						<div className="grid gap-5 xl:grid-cols-5">
							<Panel className="xl:col-span-2">
								<h2 className="text-sm font-semibold">Status laporan</h2>
								<p className="mt-1 text-[11px] text-slate-500">Distribusi semua laporan di sistem.</p>
								<div className="mt-5 space-y-4">
									{stats.by_status.map((item) => {
										const width = stats.total_reports
											? (item.count / stats.total_reports) * 100
											: 0;
										return (
											<div key={item.status}>
												<div className="mb-1.5 flex justify-between text-[11px]">
													<span>{item.label}</span>
													<span className="font-semibold">{item.count}</span>
												</div>
												<div className={`h-1.5 overflow-hidden rounded-full ${
													isLightTheme ? "bg-slate-100" : "bg-slate-800"
												}`}>
													<div
														className={`h-full rounded-full ${
															item.status === "pending"
																? "bg-amber-500"
																: item.status === "verified"
																	? "bg-indigo-500"
																	: item.status === "followed_up"
																		? "bg-emerald-500"
																		: "bg-rose-500"
														}`}
														style={{ width: `${width}%` }}
													/>
												</div>
											</div>
										);
									})}
								</div>
								<div className={`mt-6 grid grid-cols-2 gap-3 border-t pt-4 ${
									isLightTheme ? "border-slate-100" : "border-white/[0.06]"
								}`}>
									<div>
										<p className="text-[10px] text-slate-500">Terverifikasi</p>
										<p className="mt-1 text-lg font-semibold">{stats.verified_reports}</p>
									</div>
									<div>
										<p className="text-[10px] text-slate-500">Ditolak</p>
										<p className="mt-1 text-lg font-semibold">{stats.rejected_reports}</p>
									</div>
								</div>
							</Panel>

							<Panel className="xl:col-span-3">
								<div className="flex items-start justify-between gap-3">
									<div>
										<h2 className="text-sm font-semibold">Laporan terbaru</h2>
										<p className="mt-1 text-[11px] text-slate-500">Antrean diprioritaskan oleh sistem backend.</p>
									</div>
									<Link href="/admin/reports" className="text-[11px] font-semibold text-indigo-500">
										Buka antrean →
									</Link>
								</div>
								<div className={`mt-4 divide-y ${
									isLightTheme ? "divide-slate-100" : "divide-white/[0.05]"
								}`}>
									{reports.map((report) => (
										<Link
											key={report.id}
											href={`/admin/reports/${report.id}`}
											className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
										>
											<div className="min-w-0">
												<p className="truncate text-xs font-semibold">{report.title}</p>
												<p className="mt-1 text-[10px] text-slate-500">
													{report.ticket_number} · {report.category?.name ?? "Belum berkategori"}
												</p>
											</div>
											<div className="flex items-center gap-2">
												<StatusBadge status={report.priority} kind="priority" label={report.priority_label} />
												<StatusBadge status={report.status} label={report.status_label} />
											</div>
										</Link>
									))}
									{reports.length === 0 && (
										<p className="py-8 text-center text-xs text-slate-500">Belum ada laporan.</p>
									)}
								</div>
							</Panel>
						</div>

						<div className="grid gap-5 xl:grid-cols-2">
							<Panel>
								<h2 className="text-sm font-semibold">Kategori laporan</h2>
								<div className="mt-4 grid gap-2 sm:grid-cols-2">
									{stats.by_category.map((category) => (
										<div
											key={category.category_id}
											className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 ${
												isLightTheme ? "bg-slate-50" : "bg-white/[0.03]"
											}`}
										>
											<span className="truncate text-xs">{category.name}</span>
											<span className="text-xs font-semibold text-indigo-500">{category.count}</span>
										</div>
									))}
									{stats.by_category.length === 0 && (
										<p className="text-xs text-slate-500">Belum ada data kategori.</p>
									)}
								</div>
							</Panel>
							<Panel>
								<h2 className="text-sm font-semibold">Tingkat prioritas</h2>
								<div className="mt-4 space-y-3">
									{stats.by_priority.map((item) => (
										<div key={item.priority} className="flex items-center justify-between text-xs">
											<StatusBadge status={item.priority} label={item.label} kind="priority" />
											<span className="font-semibold">{item.count} laporan</span>
										</div>
									))}
								</div>
							</Panel>
						</div>
					</>
				) : null}
			</PortalLayout>
		</RequireUser>
	);
}
