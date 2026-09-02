import { Step } from "./bookingReducer";

export interface StepMeta {
    step: Step;
    title: string;
}

// Shared between the mobile accordion's collapsed-row labels and (indirectly)
// the desktop progress bar, so step titles live in one place.
export const STEP_META: StepMeta[] = [
    { step: 1, title: "Izaberi kategoriju" },
    { step: 2, title: "Datum i vreme" },
    { step: 3, title: "Podaci" },
    { step: 4, title: "Potvrda" },
];
