import { BookingState, Step } from "./bookingReducer";

// Step 1 is real (D1). Steps 2-4 still hold stub placeholders until their
// own gates land.
export function stepSummaryLabel(step: Step, state: BookingState): string {
    switch (step) {
        case 1:
            return state.serviceName ? `${state.category} · ${state.serviceName}` : "—";
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
            return !!state.serviceId;
        case 2:
            return !!state.slot;
        case 3:
            return !!state.customerName;
        case 4:
            return false;
    }
}
