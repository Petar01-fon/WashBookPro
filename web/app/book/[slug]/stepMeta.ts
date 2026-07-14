import { Step } from "./bookingReducer";

export interface StepMeta {
    step: Step;
    title: string;
    description: string;
}

// Shared between the desktop main content and the mobile accordion so step
// copy lives in one place. Gate D replaces these stub descriptions with real
// step components.
export const STEP_META: StepMeta[] = [
    { step: 1, title: "Izaberi kategoriju", description: "Placeholder — kategorija i usluga dolaze u sledećem gate-u." },
    { step: 2, title: "Datum i vreme", description: "Placeholder — kalendar i slobodni termini dolaze u sledećem gate-u." },
    { step: 3, title: "Podaci", description: "Placeholder — kontakt podaci i tablica dolaze u sledećem gate-u." },
    { step: 4, title: "Potvrda", description: "Placeholder — pregled i slanje rezervacije dolaze u sledećem gate-u." },
];
