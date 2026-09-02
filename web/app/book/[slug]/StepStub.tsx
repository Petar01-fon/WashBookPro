"use client";

interface Props {
    title: string;
    description: string;
    showBack: boolean;
    nextLabel: string;
    onBack: () => void;
    onAdvance: () => void;
}

// Gate C placeholder body shared by all four steps. Gate D replaces this
// with real per-step content (category/service picker, calendar, form, confirm).
export function StepStub({ title, description, showBack, nextLabel, onBack, onAdvance }: Props) {
    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold text-[var(--wb-fg)]">{title}</h2>
            <p className="text-sm text-[var(--wb-muted)]">{description}</p>

            <div className="flex items-center gap-3 pt-2">
                {showBack && (
                    <button
                        onClick={onBack}
                        className="px-4 py-2.5 rounded-xl text-sm font-semibold text-[var(--wb-fg)] border border-[var(--wb-border)] hover:border-[var(--wb-fg)]/30 transition-colors"
                    >
                        ← Nazad
                    </button>
                )}
                <button
                    onClick={onAdvance}
                    className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-[var(--wb-accent)] hover:bg-[var(--wb-accent)]/90 transition-colors"
                >
                    {nextLabel}
                </button>
            </div>
        </div>
    );
}
