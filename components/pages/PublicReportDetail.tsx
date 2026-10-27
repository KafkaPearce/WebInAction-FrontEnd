"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import PortalLayout from "@/components/PortalLayout";
import { useAuth, useTheme } from "@/components/providers/AppProviders";
import Alert from "@/components/ui/Alert";
import LoadingState from "@/components/ui/LoadingState";
import PageHeading from "@/components/ui/PageHeading";
import Panel from "@/components/ui/Panel";
import StatusBadge from "@/components/ui/StatusBadge";
import { apiRequest, type Report } from "@/lib/backend";

export default function ReportDetailPage({ id }: { id: string }) {
	const [report, setReport] = useState<Report | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState("");
	const { user } = useAuth();
	const { isLightTheme } = useTheme();

	useEffect(() => {
		// Detail laporan butuh sesi (backend: auth:sanctum). Tunggu sesi siap.
		if (!user) return;
		const controller = new AbortController();
		apiRequest<Report>(`reports/${encodeURIComponent(id)}`, {
			signal: controller.signal,
		})
			.then((response) => {
				setReport(response.data);
				setError("");
			})
			.catch((cause: unknown) => {
				if (!controller.signal.aborted)
					setError(
						cause instanceof Error
							? cause.message
							: "Detail laporan gagal dimuat.",
					);
			})
			.finally(() => {
				if (!controller.signal.aborted) setIsLoading(false);
			});
		return () => controller.abort();
	}, [id, user]);

	return (
		<PortalLayout title="Detail laporan">
			{isLoading ? (
				<Panel><LoadingState label="Memuat detail laporan..." /></Panel>
			) : error ? (
				<Panel className="space-y-4">
					<Alert message={error} />
					{!user && (
						<p className="text-xs text-slate-500">
							Laporan privat atau yang masih menunggu hanya dapat dilihat setelah masuk oleh pemilik atau petugas.{" "}
							<Link
								href={`/login?next=${encodeURIComponent(`/reports/${id}`)}`}
								className="font-semibold text-indigo-500"
							>
								Masuk untuk melanjutkan
							</Link>
						</p>
					)}
					<Link href="/reports" className="inline-block text-xs font-semibold text-indigo-500">
						← Kembali ke laporan publik
					</Link>
				</Panel>
			) : report ? (
				<>
					<PageHeading
						eyebrow={report.ticket_number}
						title={report.title}
						description={`${report.report_type === "pengaduan" ? "Pengaduan" : "Aspirasi"} · dibuat ${new Date(report.created_at).toLocaleString("id-ID")}`}
						actions={
							<Link
								href={user?.role === "citizen" ? "/my-reports" : "/reports"}
								className={`rounded-lg border px-3 py-2 text-xs font-medium ${
									isLightTheme ? "border-slate-200" : "border-white/10"
								}`}
							>
								← Kembali
							</Link>
						}
					/>
					<div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
						<div className="space-y-5">
							<Panel>
								<div className="flex flex-wrap gap-2">
									<StatusBadge status={report.status} label={report.status_label} />
									<StatusBadge
										status={report.priority}
										label={report.priority_label}
										kind="priority"
									/>
									{report.is_private && (
										<span className="rounded-full border border-slate-500/20 bg-slate-500/10 px-2 py-1 text-[10px] font-semibold text-slate-500">
											Privat
										</span>
									)}
								</div>
								<div className="mt-5 grid gap-4 sm:grid-cols-2">
									<div>
										<p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
											Lokasi
										</p>
										<p className="mt-1 text-sm">{report.location_text}</p>
									</div>
									<div>
										<p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
											Tanggal kejadian
										</p>
										<p className="mt-1 text-sm">
											{report.incident_date
												? new Date(report.incident_date).toLocaleDateString("id-ID")
												: "Tidak dicantumkan"}
										</p>
									</div>
									<div>
										<p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
											Kategori disposisi
										</p>
										<p className="mt-1 text-sm">{report.category?.name ?? "Menunggu verifikasi"}</p>
									</div>
									<div>
										<p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
											Pelapor
										</p>
										<p className="mt-1 text-sm">{report.reporter_name ?? "Tidak tersedia"}</p>
									</div>
								</div>
								<div className={`mt-5 border-t pt-5 ${
									isLightTheme ? "border-slate-100" : "border-white/[0.06]"
								}`}>
									<p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
										Deskripsi
									</p>
									<p className={`mt-2 whitespace-pre-wrap text-sm leading-relaxed ${
										isLightTheme ? "text-slate-700" : "text-slate-300"
									}`}>
										{report.description ?? "Deskripsi tidak tersedia."}
									</p>
								</div>
								{report.image_url && (
									<div className="mt-5">
										<p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
											Foto pendukung
										</p>
										<a
											href={report.image_url}
											target="_blank"
											rel="noreferrer"
											className="text-xs font-semibold text-indigo-500 underline"
										>
											Buka foto laporan
										</a>
									</div>
								)}
							</Panel>

							<Panel>
								<h2 className="text-sm font-semibold">Riwayat penanganan</h2>
								<div className="mt-5 space-y-5">
									{report.timeline_logs?.map((log, index) => (
										<div key={log.id} className="relative flex gap-3">
											<div className="flex flex-col items-center">
												<span className={`mt-1 h-2.5 w-2.5 rounded-full ${
													index === report.timeline_logs!.length - 1
														? "bg-indigo-500"
														: "bg-emerald-500"
												}`} />
												{index < report.timeline_logs!.length - 1 && (
													<span className="mt-1 h-full w-px bg-slate-500/20" />
												)}
											</div>
											<div className="pb-1">
												<p className="text-xs font-semibold">{log.status_label}</p>
												<p className="mt-0.5 text-[10px] text-slate-500">
													{log.changed_by_name} · {log.created_at_label}
												</p>
												{log.note && (
													<p className={`mt-2 whitespace-pre-wrap text-xs leading-relaxed ${
														isLightTheme ? "text-slate-600" : "text-slate-400"
													}`}>
														{log.note}
													</p>
												)}
												{log.proof_img && (
													<a
														href={log.proof_img}
														target="_blank"
														rel="noreferrer"
														className="mt-2 inline-block text-[11px] font-semibold text-indigo-500 underline"
													>
														Lihat foto bukti
													</a>
												)}
											</div>
										</div>
									))}
								</div>
							</Panel>
						</div>

						<Panel>
							<h2 className="text-sm font-semibold">Analisis AI</h2>
							<p className="mt-1 text-[11px] text-slate-500">
								Rekomendasi awal untuk membantu proses verifikasi petugas.
							</p>
							<div className="mt-4 space-y-4">
								<div>
									<p className="text-[10px] text-slate-500">Kategori prediksi</p>
									<p className="mt-1 text-sm font-medium">
										{report.ai_analysis.predicted_category_name ?? "Belum tersedia"}
									</p>
								</div>
								<div>
									<div className="flex justify-between text-[10px]">
										<span className="text-slate-500">Confidence kategori</span>
										<span className="font-semibold">
											{report.ai_analysis.confidence === null
												? "—"
												: `${Math.round(report.ai_analysis.confidence * 100)}%`}
										</span>
									</div>
									{report.ai_analysis.confidence !== null && (
										<div className={`mt-2 h-1.5 overflow-hidden rounded-full ${
											isLightTheme ? "bg-slate-100" : "bg-slate-800"
										}`}>
											<div
												className="h-full rounded-full bg-indigo-500"
												style={{
													width: `${Math.min(100, Math.max(0, report.ai_analysis.confidence * 100))}%`,
												}}
											/>
										</div>
									)}
								</div>
								<div>
									<p className="text-[10px] text-slate-500">Prioritas AI</p>
									<p className="mt-1 text-sm font-medium">
										{report.ai_analysis.predicted_priority ?? "Belum tersedia"}
									</p>
								</div>
							</div>
							{user && user.role !== "citizen" && (
								<Link
									href={`/admin/reports/${report.id}`}
									className="mt-5 inline-flex w-full justify-center rounded-lg bg-indigo-500 px-3 py-2.5 text-xs font-semibold text-white hover:bg-indigo-600"
								>
									Buka panel petugas
								</Link>
							)}
						</Panel>
					</div>
				</>
			) : null}
		</PortalLayout>
	);
}
