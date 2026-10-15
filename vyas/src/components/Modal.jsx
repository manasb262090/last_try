import { X } from "./icons.jsx"

export default function Modal({ children, eyebrow, onClose, title }) {
  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
      role="dialog"
    >
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-200 bg-white/95 px-6 py-5 backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
          <div>
            {eyebrow && (
              <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-400">
                {eyebrow}
              </p>
            )}
            <h2 className="font-display text-2xl text-slate-950 dark:text-white">
              {title}
            </h2>
          </div>
          <button
            aria-label="Close modal"
            className="grid size-9 place-items-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 dark:border-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
            onClick={onClose}
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}
