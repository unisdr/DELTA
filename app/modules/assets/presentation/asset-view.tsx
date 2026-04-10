import { Link } from "react-router";
import { MainContainer } from "~/frontend/container";
import type { Asset } from "~/modules/assets/domain/entities/asset";
import type { AssetSectorDisplay } from "~/modules/assets/domain/repositories/asset-repository";
import { ASSETS_ROUTE } from "~/modules/assets/presentation/asset-form";

interface AssetViewProps {
    item: Asset;
    sectorDisplay?: AssetSectorDisplay[];
}

export function AssetView({ item, sectorDisplay }: AssetViewProps) {
    const sectorNames = sectorDisplay?.map((s) => s.name) ?? [];
    const isBuiltIn = item.isBuiltIn === true;
    const showFallbackSector = sectorNames.length === 0;
    const valueClassName = "mt-1 text-sm text-slate-900 md:text-base";

    return (
        <MainContainer title={"Assets"}>
            <div className="mx-auto w-full max-w-5xl px-4 py-6 md:px-6 md:py-8">
                <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-cyan-50 via-white to-blue-50 shadow-sm">
                    <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-cyan-200/35 blur-3xl" />
                    <div className="absolute -bottom-16 -left-10 h-48 w-48 rounded-full bg-blue-200/35 blur-3xl" />

                    <div className="relative z-10 flex flex-col gap-4 p-6 md:p-8">
                        <div className="flex flex-wrap items-center gap-3">
                            <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold tracking-wide ${isBuiltIn
                                        ? "bg-slate-800 text-white"
                                        : "bg-emerald-600 text-white"
                                    }`}
                            >
                                {isBuiltIn ? "Built-in asset" : "Custom asset"}
                            </span>
                            <span className="rounded-full border border-slate-300 bg-white/85 px-3 py-1 text-xs font-medium text-slate-600">
                                {`ID: ${item.id.slice(0, 8)}`}
                            </span>
                        </div>

                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
                                {item.name || "Unnamed asset"}
                            </h1>
                            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 md:text-base">
                                {"Review asset details, associated sectors, and identifiers in one place."}
                            </p>
                        </div>
                    </div>
                </section>

                <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{"Category"}</p>
                        <p className={valueClassName}>{item.category || "Not specified"}</p>
                    </article>

                    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{"National ID"}</p>
                        <p className={valueClassName}>{item.nationalId || "Not specified"}</p>
                    </article>
                </section>

                <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{"Sector"}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                        {showFallbackSector ? (
                            <span className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-sm text-slate-600">
                                {"Not specified"}
                            </span>
                        ) : (
                            sectorNames.map((name) => (
                                <span
                                    key={name}
                                    className="rounded-full bg-cyan-100 px-3 py-1 text-sm font-medium text-cyan-900"
                                >
                                    {name}
                                </span>
                            ))
                        )}
                    </div>
                </section>

                <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{"Notes"}</p>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-800 md:text-base">
                        {item.notes || "No notes added for this asset."}
                    </p>
                </section>

                {isBuiltIn && (
                    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        {"This is a built-in asset and cannot be edited or deleted."}
                    </div>
                )}

                <section className="mt-6 flex flex-wrap items-center gap-3">
                    <Link
                        to={ASSETS_ROUTE}
                        className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                        {"Back to assets"}
                    </Link>

                    {!isBuiltIn && (
                        <Link
                            to={`${ASSETS_ROUTE}/${item.id}/edit`}
                            className="inline-flex items-center rounded-lg bg-cyan-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-800"
                        >
                            {"Edit asset"}
                        </Link>
                    )}

                    {!isBuiltIn && (
                        <Link
                            to={`${ASSETS_ROUTE}/${item.id}/delete`}
                            className="inline-flex items-center rounded-lg border border-rose-300 bg-white px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
                        >
                            {"Delete asset"}
                        </Link>
                    )}
                </section>
            </div>
        </MainContainer>
    );
}
