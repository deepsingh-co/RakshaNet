import { X, Award, Download, Printer, CheckCircle2, ShieldCheck } from 'lucide-react';
import { usePortalStore } from '../store/portalStore';

interface CertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseTitle: string;
  instructor: string;
}

export function CertificateModal({ isOpen, onClose, courseTitle, instructor }: CertificateModalProps) {
  const currentUser = usePortalStore((s) => s.currentUser);

  if (!isOpen) return null;

  const certificateId = `CERT-RN-${Math.random().toString(36).substring(2, 8).toUpperCase()}-2026`;
  const issueDate = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="relative max-h-[95vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 sm:p-8">
        <div className="flex items-center justify-between pb-4">
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400">
              <Award className="size-5" />
            </span>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Verifiable Certificate of Achievement</h3>
              <p className="text-xs text-slate-500">RakshaNet Women Empowerment &amp; Education Council</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Certificate Canvas / Container */}
        <div
          id="printable-certificate"
          className="relative my-4 overflow-hidden rounded-2xl border-8 border-double border-amber-200 bg-gradient-to-br from-amber-50/50 via-white to-rose-50/30 p-8 text-center shadow-inner dark:border-amber-900/60 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900"
        >
          {/* Subtle seal watermark */}
          <div className="pointer-events-none absolute right-8 top-8 opacity-5">
            <ShieldCheck className="size-64 text-amber-600" />
          </div>

          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-gradient-to-tr from-amber-500 to-rose-500 text-white shadow-lg ring-4 ring-amber-100 dark:ring-amber-950">
            <Award className="size-8" />
          </div>

          <p className="mt-4 text-xs font-bold uppercase tracking-widest text-amber-700 dark:text-amber-400">
            RakshaNet Women Development Platform · Certified Credential
          </p>

          <h2 className="mt-2 font-serif text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            Certificate of Completion
          </h2>

          <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
            This certifies that
          </p>

          <h3 className="mt-2 text-2xl font-black text-rose-600 dark:text-rose-400 sm:text-3xl">
            {currentUser.name}
          </h3>

          <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            has successfully fulfilled all curriculum requirements, interactive exercises, and verified assessments for
          </p>

          <div className="mx-auto my-4 max-w-xl rounded-xl bg-white/80 p-3 shadow-sm ring-1 ring-slate-200/60 dark:bg-slate-800/80 dark:ring-slate-700">
            <h4 className="text-lg font-bold text-slate-900 dark:text-white">
              {courseTitle}
            </h4>
          </div>

          <div className="mt-8 flex flex-col items-center justify-between border-t border-slate-200/80 pt-6 text-xs text-slate-500 dark:border-slate-700/80 sm:flex-row">
            <div className="text-left">
              <p className="font-bold text-slate-800 dark:text-slate-200">{instructor}</p>
              <p className="text-[11px]">Lead Course Instructor</p>
            </div>
            <div className="my-3 flex items-center gap-1.5 font-mono text-[11px] text-emerald-600 dark:text-emerald-400 sm:my-0">
              <CheckCircle2 className="size-4" />
              <span>Verifiable ID: {certificateId}</span>
            </div>
            <div className="text-right">
              <p className="font-bold text-slate-800 dark:text-slate-200">{issueDate}</p>
              <p className="text-[11px]">Issue &amp; Validation Date</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col justify-end gap-3 sm:flex-row">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700"
          >
            <Printer className="size-4" /> Print Certificate
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 px-6 py-2.5 text-sm font-bold text-white shadow-md transition hover:from-rose-600 hover:to-pink-700"
          >
            <Download className="size-4" /> Download PDF Credential
          </button>
        </div>
      </div>
    </div>
  );
}
