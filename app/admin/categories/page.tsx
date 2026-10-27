"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import RequireUser from "@/components/RequireUser";
import PortalLayout from "@/components/PortalLayout";
import { useTheme } from "@/components/providers/AppProviders";
import Alert from "@/components/ui/Alert";
import EmptyState from "@/components/ui/EmptyState";
import LoadingState from "@/components/ui/LoadingState";
import PageHeading from "@/components/ui/PageHeading";
import Panel from "@/components/ui/Panel";
import { apiRequest, type Category } from "@/lib/backend";

export default function AdminCategoriesPage() {
	const [categories, setCategories] = useState<Category[]>([]);
	const [editingId, setEditingId] = useState<number | null>(null);
	const [name, setName] = useState("");
	const [icon, setIcon] = useState("");
	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");
	const { isLightTheme } = useTheme();

	const loadCategories = useCallback(async () => {
		try {
			const response = await apiRequest<Category[]>("categories?with_counts=1");
			setCategories(response.data);
			setError("");
		} catch (cause) {
			setError(
				cause instanceof Error
					? cause.message
					: "Kategori gagal dimuat.",
			);
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		let isMounted = true;
		apiRequest<Category[]>("categories?with_counts=1")
			.then((response) => {
				if (isMounted) setCategories(response.data);
			})
			.catch((cause: unknown) => {
				if (isMounted)
					setError(
						cause instanceof Error
							? cause.message
							: "Kategori gagal dimuat.",
					);
			})
			.finally(() => {
				if (isMounted) setIsLoading(false);
			});
		return () => {
			isMounted = false;
		};
	}, []);

	function startEdit(category: Category) {
		setEditingId(category.id);
		setName(category.name);
		setIcon(category.icon ?? "");
		setError("");
		setSuccess("");
	}

	function resetForm() {
		setEditingId(null);
		setName("");
		setIcon("");
	}

	async function handleSave(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setError("");
		setSuccess("");
		setIsSaving(true);
		try {
			const body = JSON.stringify({
				name: name.trim(),
				icon: icon.trim() || null,
			});
			const response = editingId
				? await apiRequest<Category>(`categories/${editingId}`, {
						method: "PUT",
						body,
					})
				: await apiRequest<Category>("categories", {
						method: "POST",
						body,
					});
			setSuccess(response.message);
			resetForm();
			await loadCategories();
		} catch (cause) {
			setError(
				cause instanceof Error
					? cause.message
					: "Kategori gagal disimpan.",
			);
		} finally {
			setIsSaving(false);
		}
	}

	async function handleDelete(category: Category) {
		const confirmed = window.confirm(
			`Hapus kategori "${category.name}"? Kategori yang digunakan laporan akan ditolak oleh server.`,
		);
		if (!confirmed) return;
		setError("");
		setSuccess("");
		try {
			const response = await apiRequest<null>(`categories/${category.id}`, {
				method: "DELETE",
			});
			setSuccess(response.message);
			if (editingId === category.id) resetForm();
			await loadCategories();
		} catch (cause) {
			setError(
				cause instanceof Error
					? cause.message
					: "Kategori gagal dihapus.",
			);
		}
	}

	const fieldClass = `w-full rounded-lg border px-3 py-2.5 text-xs outline-none focus:border-indigo-400 ${
		isLightTheme
			? "border-slate-200 bg-white"
			: "border-white/10 bg-slate-950/40"
	}`;

	return (
		<RequireUser roles={["verifier_admin", "agency_admin"]}>
			<PortalLayout title="Kategori laporan">
				<PageHeading
					eyebrow="Pengaturan sistem"
					title="Kategori laporan"
					description="Kelola master data kategori yang digunakan sebagai label klasifikasi AI."
				/>
				{error && <Alert message={error} />}
				{success && <Alert message={success} type="success" />}
				<div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
					<Panel className="p-0">
						<div className={`border-b px-4 py-3 ${
							isLightTheme ? "border-slate-100" : "border-white/[0.06]"
						}`}>
							<h2 className="text-xs font-semibold">Master kategori</h2>
							<p className="mt-1 text-[10px] text-slate-500">
								{categories.length} kategori tersedia
							</p>
						</div>
						{isLoading ? (
							<LoadingState label="Memuat kategori..." />
						) : categories.length === 0 ? (
							<EmptyState
								title="Belum ada kategori"
								description="Tambahkan kategori melalui formulir di samping."
							/>
						) : (
							<div className={`divide-y ${
								isLightTheme ? "divide-slate-100" : "divide-white/[0.05]"
							}`}>
								{categories.map((category) => (
									<div key={category.id} className="flex items-center justify-between gap-3 px-4 py-3">
										<div className="flex min-w-0 items-center gap-3">
											<span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg ${
												isLightTheme ? "bg-slate-100" : "bg-white/[0.04]"
											}`}>
												{category.icon || "•"}
											</span>
											<div className="min-w-0">
												<p className="truncate text-xs font-semibold">{category.name}</p>
												<p className="mt-1 text-[10px] text-slate-500">
													{category.reports_count ?? 0} laporan
												</p>
											</div>
										</div>
										<div className="flex shrink-0 gap-2">
											<button
												type="button"
												onClick={() => startEdit(category)}
												className="rounded-md border border-indigo-500/20 px-2.5 py-1.5 text-[10px] font-semibold text-indigo-500 hover:bg-indigo-500/10"
											>
												Ubah
											</button>
											<button
												type="button"
												onClick={() => void handleDelete(category)}
												className="rounded-md border border-rose-500/20 px-2.5 py-1.5 text-[10px] font-semibold text-rose-500 hover:bg-rose-500/10"
											>
												Hapus
											</button>
										</div>
									</div>
								))}
							</div>
						)}
					</Panel>

					<Panel>
						<h2 className="text-sm font-semibold">
							{editingId ? "Ubah kategori" : "Tambah kategori"}
						</h2>
						<p className="mt-1 text-[10px] leading-relaxed text-slate-500">
							Nama kategori harus sesuai dengan label yang digunakan model AI.
						</p>
						<form onSubmit={handleSave} className="mt-4 space-y-3">
							<label className="block">
								<span className="mb-1.5 block text-[11px] font-medium">Nama kategori</span>
								<input
									required
									minLength={3}
									maxLength={100}
									value={name}
									onChange={(event) => setName(event.target.value)}
									className={fieldClass}
									placeholder="Contoh: Infrastruktur"
								/>
							</label>
							<label className="block">
								<span className="mb-1.5 block text-[11px] font-medium">Ikon (opsional)</span>
								<input
									maxLength={50}
									value={icon}
									onChange={(event) => setIcon(event.target.value)}
									className={fieldClass}
									placeholder="Contoh: 🛣️"
								/>
							</label>
							<div className="flex gap-2">
								<button
									type="submit"
									disabled={isSaving}
									className="flex-1 rounded-lg bg-indigo-500 px-3 py-2.5 text-xs font-semibold text-white hover:bg-indigo-600 disabled:opacity-50"
								>
									{isSaving ? "Menyimpan..." : editingId ? "Simpan perubahan" : "Tambah kategori"}
								</button>
								{editingId && (
									<button
										type="button"
										onClick={resetForm}
										className={`rounded-lg border px-3 py-2.5 text-xs ${
											isLightTheme ? "border-slate-200" : "border-white/10"
										}`}
									>
										Batal
									</button>
								)}
							</div>
						</form>
					</Panel>
				</div>
			</PortalLayout>
		</RequireUser>
	);
}
