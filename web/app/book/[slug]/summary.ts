import { BookingState, Step } from "./bookingReducer";

// Gate C: state only ever holds stub placeholders, so this just proves the
// wiring. Gate D replaces the per-step logic with real formatted values
// (service name, date/time, customer name).
export function stepSummaryLabel(step: Step, state: BookingState): string {
    switch (step) {
        case 1:
            return state.category ?? "—";
        case 2:
            return state.slot ? "Izabran termin" : "—";
        case 3:
            return state.customerName ?? "—";
        case 4:
            return "—";
    }
}

export function isStepFilled(step: Step, state: BookingState): boolean {
    switch (step) {
        case 1:
            return !!state.category;
        case 2:
            return !!state.slot;
        case 3:
            return !!state.customerName;
        case 4:
            return false;
    }
}
