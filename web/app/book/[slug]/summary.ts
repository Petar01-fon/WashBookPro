import { formatDateSr } from "@/lib/date-format";
import { BookingState, Step } from "./bookingReducer";
import { parseLocalDateString } from "./DateTimeStep";

// Steps 1-2 are real (D1, D2). Steps 3-4 still hold stub placeholders until
// their own gates land.
export function stepSummaryLabel(step: Step, state: BookingState): string {
    switch (step) {
        case 1:
            return state.serviceName ? `${state.category} · ${state.serviceName}` : "—";
        case 2: {
            if (!state.slot) return "—";
            const time = new Date(state.slot.startsAt).toLocaleTimeString("sr-Latn-RS", {
                hour: "2-digit",
                minute: "2-digit",
            });
            const date = state.date ? formatDateSr(parseLocalDateString(state.date)) : "";
            return `${date} · ${time} · ${state.slot.bayName}`;
        }
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
