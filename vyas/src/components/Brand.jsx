import { ShieldCheck } from "./icons.jsx"

export default function Brand({ compact = false, inverse = false }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`grid size-10 place-items-center rounded-xl ${
          inverse
            ? "bg-white text-slate-950"
            : "bg-slate-950 text-white dark:bg-white dark:text-slate-950"
        }`}
      >
        <ShieldCheck className="size-5" />
      </div>
      {!compact && (
        <div className={inverse ? "text-white" : "text-slate-950 dark:text-white"}>
          <p className="font-display text-lg leading-none tracking-tight">
            CampusVault
          </p>
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.22em] opacity-55">
            & Connect ERP
          </p>
        </div>
      )}
    </div>
  )
}
