"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import RequireUser from "@/components/RequireUser";
import PortalLayout from "@/components/PortalLayout";
import { useAuth, useTheme } from "@/components/providers/AppProviders";
import Alert from "@/components/ui/Alert";
import LoadingState from "@/components/ui/LoadingState";
import PageHeading from "@/components/ui/PageHeading";
import Panel from "@/components/ui/Panel";
import StatusBadge from "@/components/ui/StatusBadge";
import { apiRequest, type Category, type Report } from "@/lib/backend";

export default function AdminReportDetailPage({ id }: { id: string }) {
	const [report, setReport] = useState<Report | null>(null);
	const [categories, setCategories] = useState<Category[]>([]);
	const [categoryId, setCategoryId] = useState("");
	const [verificationNote, setVerificationNote] = useState("");
	const [rejectionNote, setRejectionNote] = useState("");
	const [followUpNote, setFollowUpNote] = useState("");
	const [proofImage, setProofImage] = useState<File | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");
	const { isLightTheme } = useTheme();
	const { user } = useAuth();

	useEffect(() => {
		if (!user || user.role === "citizen") return;
		const controller = new AbortController();
		Promise.all([
			apiRequest<Report>(`reports/${encodeURIComponent(id)}`, {
				signal: controller.signal,
			}),
			apiRequest<Category[]>("categories", { signal: controller.signal }),
		])
			.then(([reportResponse, categoryResponse]) => {
				setReport(reportResponse.data);
				setCategories(categoryResponse.data);
				setCategoryId(
					String(
						reportResponse.data.category?.id ??
							reportResponse.data.ai_analysis.predicted_category_id ??
							"",
					),
				);
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

	async function handleAction(
		event: FormEvent<HTMLFormElement>,
		action: "verify" | "reject" | "followup",
	) {
		event.preventDefault();
		setError("");
		setSuccess("");
		setIsSubmitting(true);
		try {
			let response;
			if (action === "verify") {
				response = await apiRequest<Report>(`admin/reports/${id}/verify`, {
					method: "PATCH",
					body: JSON.stringify({
						category_id: Number(categoryId),
						note: verificationNote.trim(),
					}),
				});
				setVerificationNote("");
			} else if (action === "reject") {
				response = await apiRequest<Report>(`admin/reports/${id}/reject`, {
					method: "PATCH",
					body: JSON.stringify({ note: rejectionNote.trim() }),
				});
				setRejectionNote("");
			} else {
				if (proofImage && proofImage.size > 2 * 1024 * 1024) {
					throw new Error("Ukuran foto bukti maksimal 2 MB.");
				}
				if (
					proofImage &&
					!["image/jpeg", "image/png", "image/webp"].includes(proofImage.type)
				) {
					throw new Error("Foto bukti harus berformat JPG, PNG, atau WEBP.");
				}
				const body = new FormData();
				body.set("note", followUpNote.trim());
				if (proofImage) body.set("proof_img", proofImage);
				response = await apiRequest<Report>(
					`admin/reports/${id}/followup`,
					{ method: "POST", body },
				);
				setFollowUpNote("");
				setProofImage(null);
			}
			setReport(response.data);
			setSuccess(response.message);
		} catch (cause) {
			setError(
				cause instanceof Error
					? cause.message
					: "Perubahan status gagal disimpan.",
			);
		} finally {
			setIsSubmitting(false);
		}
	}

	const fieldClass = `w-full rounded-lg border px-3 py-2.5 text-xs outline-none focus:border-indigo-400 ${
		isLightTheme
			? "border-slate-200 bg-white"
			: "border-white/10 bg-slate-950/40"
	}`;
	const noteLabelClass = "mb-1.5 block text-[11px] font-medium";

	return (
		<RequireUser roles={["verifier_admin", "agency_admin"]}>
			<PortalLayout title="Tinjau laporan">
				{isLoading ? (
					<Panel><LoadingState label="Memuat laporan..." /></Panel>
				) : error && !report ? (
					<Panel className="space-y-4">
						<Alert message={error} />
						<Link href="/admin/reports" className="text-xs font-semibold text-indigo-500">
							← Kembali ke antrean
						</Link>
					</Panel>
				) : report ? (
					<>
						<PageHeading
							eyebrow={`Tiket ${report.ticket_number}`}
							title={report.title}
							description={`${report.reporter_name ?? "Pelapor tidak tersedia"} · ${report.location_text}`}
							actions={
								<Link
									href="/admin/reports"
									className={`rounded-lg border px-3 py-2 text-xs font-medium ${
										isLightTheme ? "border-slate-200" : "border-white/10"
									}`}
								>
									← Kembali ke antrean
								</Link>
							}
						/>
						{error && <Alert message={error} />}
						{success && <Alert message={success} type="success" />}
						<div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
							<div className="space-y-5">
								<Panel>
									<div className="flex flex-wrap items-center gap-2">
										<StatusBadge status={report.status} label={report.status_label} />
										<StatusBadge status={report.priority} label={report.priority_label} kind="priority" />
										<span className="rounded-full border border-slate-500/20 bg-slate-500/10 px-2 py-1 text-[10px] text-slate-500">
											{report.report_type === "pengaduan" ? "Pengaduan" : "Aspirasi"}
										</span>
										{report.is_anonymous && (
											<span className="rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2 py-1 text-[10px] text-indigo-500">
												Anonim
											</span>
										)}
										{report.is_private && (
											<span className="rounded-full border border-slate-500/20 bg-slate-500/10 px-2 py-1 text-[10px] text-slate-500">
												Privat
											</span>
										)}
									</div>
									<div className="mt-5 grid gap-4 sm:grid-cols-2">
										<div>
											<p className="text-[10px] text-slate-500">Kategori hasil disposisi</p>
											<p className="mt-1 text-sm font-medium">{report.category?.name ?? "Belum diverifikasi"}</p>
										</div>
										<div>
											<p className="text-[10px] text-slate-500">Tanggal kejadian</p>
											<p className="mt-1 text-sm">
												{report.incident_date
													? new Date(report.incident_date).toLocaleDateString("id-ID")
													: "Tidak dicantumkan"}
											</p>
										</div>
									</div>
									<div className={`mt-5 border-t pt-5 ${
										isLightTheme ? "border-slate-100" : "border-white/[0.06]"
									}`}>
										<p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
											Deskripsi laporan
										</p>
										<p className={`mt-2 whitespace-pre-wrap text-sm leading-relaxed ${
											isLightTheme ? "text-slate-700" : "text-slate-300"
										}`}>
											{report.description ?? "Deskripsi tidak tersedia."}
										</p>
									</div>
									{report.image_url && (
										<a
											href={report.image_url}
											target="_blank"
											rel="noreferrer"
											className="mt-4 inline-block text-xs font-semibold text-indigo-500 underline"
										>
											Buka foto laporan
										</a>
									)}
								</Panel>

								<Panel>
									<h2 className="text-sm font-semibold">Analisis AI</h2>
									<div className="mt-4 grid gap-4 sm:grid-cols-3">
										<div>
											<p className="text-[10px] text-slate-500">Kategori prediksi</p>
											<p className="mt-1 text-xs font-medium">
												{report.ai_analysis.predicted_category_name ?? "Tidak tersedia"}
											</p>
										</div>
										<div>
											<p className="text-[10px] text-slate-500">Confidence kategori</p>
											<p className="mt-1 text-xs font-medium">
												{report.ai_analysis.confidence === null
													? "Tidak tersedia"
													: `${Math.round(report.ai_analysis.confidence * 100)}%`}
											</p>
										</div>
										<div>
											<p className="text-[10px] text-slate-500">Prediksi prioritas</p>
											<p className="mt-1 text-xs font-medium">
												{report.ai_analysis.predicted_priority ?? "Tidak tersedia"}
											</p>
										</div>
									</div>
									{report.ai_analysis.is_corrected && (
										<p className="mt-4 rounded-lg bg-amber-500/10 px-3 py-2 text-[11px] text-amber-600">
											Kategori final berbeda dari prediksi AI. Koreksi ini tercatat untuk evaluasi model.
										</p>
									)}
								</Panel>

								<Panel>
									<h2 className="text-sm font-semibold">Audit trail</h2>
									<div className="mt-4 space-y-4">
										{report.timeline_logs?.map((log) => (
											<div key={log.id} className={`border-l-2 pl-3 ${
												isLightTheme ? "border-indigo-200" : "border-indigo-500/30"
											}`}>
												<p className="text-xs font-semibold">{log.status_label}</p>
												<p className="mt-0.5 text-[10px] text-slate-500">
													{log.changed_by_name} · {log.created_at_label}
												</p>
												{log.note && (
													<p className="mt-2 whitespace-pre-wrap text-xs text-slate-500">{log.note}</p>
												)}
												{log.proof_img && (
													<a href={log.proof_img} target="_blank" rel="noreferrer" className="mt-1 inline-block text-[10px] font-semibold text-indigo-500 underline">
														Buka foto bukti
													</a>
												)}
											</div>
										))}
									</div>
								</Panel>
							</div>

							<div className="space-y-4">
								{report.status === "pending" && (
									<>
										<Panel>
											<h2 className="text-sm font-semibold">Verifikasi & disposisi</h2>
											<p className="mt-1 text-[10px] text-slate-500">
												Pilih kategori final dan tulis memo penugasan minimal 10 karakter.
											</p>
											<form onSubmit={(event) => void handleAction(event, "verify")} className="mt-4 space-y-3">
												<label className="block">
													<span className={noteLabelClass}>Kategori tujuan</span>
													<select
														required
														value={categoryId}
														onChange={(event) => setCategoryId(event.target.value)}
														className={fieldClass}
													>
														<option value="">Pilih kategori</option>
														{categories.map((category) => (
															<option key={category.id} value={category.id}>{category.name}</option>
														))}
													</select>
												</label>
												<label className="block">
													<span className={noteLabelClass}>Memo penugasan</span>
													<textarea
														required
														minLength={10}
														maxLength={2000}
														rows={4}
														value={verificationNote}
														onChange={(event) => setVerificationNote(event.target.value)}
														className={`${fieldClass} resize-y`}
														placeholder="Jelaskan penugasan dan arahan penanganan..."
													/>
												</label>
												<button
													type="submit"
													disabled={isSubmitting || !categoryId}
													className="w-full rounded-lg bg-indigo-500 px-3 py-2.5 text-xs font-semibold text-white hover:bg-indigo-600 disabled:opacity-50"
												>
													{isSubmitting ? "Menyimpan..." : "Verifikasi laporan"}
												</button>
											</form>
										</Panel>
										<Panel>
											<h2 className="text-sm font-semibold">Tolak laporan</h2>
											<p className="mt-1 text-[10px] text-slate-500">
												Alasan penolakan wajib dicatat agar dapat dilihat pelapor.
											</p>
											<form onSubmit={(event) => void handleAction(event, "reject")} className="mt-3 space-y-3">
												<label className="block">
													<span className={noteLabelClass}>Alasan penolakan</span>
													<textarea
														required
														minLength={10}
														maxLength={2000}
														rows={3}
														value={rejectionNote}
														onChange={(event) => setRejectionNote(event.target.value)}
														className={`${fieldClass} resize-y`}
														placeholder="Jelaskan alasan penolakan..."
													/>
												</label>
												<button
													type="submit"
													disabled={isSubmitting}
													className="w-full rounded-lg border border-rose-500/20 px-3 py-2.5 text-xs font-semibold text-rose-500 hover:bg-rose-500/10 disabled:opacity-50"
												>
													{isSubmitting ? "Menyimpan..." : "Tolak laporan"}
												</button>
											</form>
										</Panel>
									</>
								)}

								{report.status === "verified" && (
									<Panel>
										<h2 className="text-sm font-semibold">Catat tindak lanjut</h2>
										<p className="mt-1 text-[10px] text-slate-500">
											Tulis hasil penanganan. Foto bukti opsional (maksimal 2 MB).
										</p>
										<form onSubmit={(event) => void handleAction(event, "followup")} className="mt-4 space-y-3">
											<label className="block">
												<span className={noteLabelClass}>Catatan tindak lanjut</span>
												<textarea
													required
													minLength={10}
													maxLength={2000}
													rows={5}
													value={followUpNote}
													onChange={(event) => setFollowUpNote(event.target.value)}
													className={`${fieldClass} resize-y`}
													placeholder="Jelaskan tindakan yang sudah dilakukan..."
												/>
											</label>
											<label className="block">
												<span className={noteLabelClass}>Foto bukti (opsional)</span>
												<input
													type="file"
													accept="image/jpeg,image/png,image/webp"
													onChange={(event) => setProofImage(event.target.files?.[0] ?? null)}
													className="block w-full text-[10px] text-slate-500 file:mr-2 file:rounded-md file:border-0 file:bg-indigo-500/10 file:px-3 file:py-2 file:text-[10px] file:font-semibold file:text-indigo-500"
												/>
											</label>
											<button
												type="submit"
												disabled={isSubmitting}
												className="w-full rounded-lg bg-emerald-600 px-3 py-2.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
											>
												{isSubmitting ? "Menyimpan..." : "Simpan tindak lanjut"}
											</button>
										</form>
									</Panel>
								)}

								{["followed_up", "rejected"].includes(report.status) && (
									<Panel>
										<h2 className="text-sm font-semibold">Tidak ada aksi lanjutan</h2>
										<p className="mt-1 text-xs text-slate-500">
											Laporan ini berstatus {report.status_label.toLowerCase()}. Riwayat perubahan tercatat pada audit trail.
										</p>
									</Panel>
								)}
							</div>
						</div>
					</>
				) : null}
			</PortalLayout>
		</RequireUser>
	);
}
