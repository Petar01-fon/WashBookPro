export type Step = 1 | 2 | 3 | 4;

export interface BookingSlot {
    bayId: string;
    startsAt: string;
}

export interface BookingState {
    step: Step;
    category?: string;
    serviceId?: string;
    date?: string;
    slot?: BookingSlot;
    customerName?: string;
    customerPhone?: string;
    customerEmail?: string;
    notes?: string;
    plateNumber?: string;
}

export const initialBookingState: BookingState = { step: 1 };

export type BookingAction =
    | { type: "ADVANCE" }
    | { type: "BACK" }
    | { type: "JUMP_TO_STEP"; step: Step };

// Gate C stub: ADVANCE sets a placeholder value for the current step so the
// collapse -> accent -> auto-open behavior is visible without real inputs.
// Gate D replaces these placeholders with real selections.
export function bookingReducer(state: BookingState, action: BookingAction): BookingState {
    switch (action.type) {
        case "ADVANCE": {
            const next: BookingState = { ...state };
            if (state.step === 1) next.category = "stub";
            if (state.step === 2) next.slot = { bayId: "stub", startsAt: "stub" };
            if (state.step === 3) next.customerName = "stub";
            next.step = (Math.min(4, state.step + 1) as Step);
            return next;
        }
        case "BACK":
            return { ...state, step: (Math.max(1, state.step - 1) as Step) };
        case "JUMP_TO_STEP":
            return { ...state, step: action.step };
        default:
            return state;
    }
}
