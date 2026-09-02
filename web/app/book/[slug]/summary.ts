import { formatDateSr } from "@/lib/date-format";
import { BookingState, Step } from "./bookingReducer";
import { parseLocalDateString } from "./DateTimeStep";

// Steps 1-3 are real (D1, D2, D3). Step 4 still holds a stub placeholder until
// its own gate lands.
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
        case 3: {
            if (!state.customerName) return "—";
            const parts = [state.customerName];
            if (state.customerPhone) parts.push(state.customerPhone);
            if (state.plateNumber) parts.push(state.plateNumber);
            return parts.join(" · ");
        }
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
