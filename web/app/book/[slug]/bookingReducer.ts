export type Step = 1 | 2 | 3 | 4;

export interface BookingSlot {
    bayId: string;
    startsAt: string;
}

export interface BookingState {
    step: Step;
    category?: string;
    serviceId?: string;
    serviceName?: string;
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
    | { type: "SELECT_CATEGORY"; category: string }
    | { type: "SELECT_SERVICE"; serviceId: string; serviceName: string }
    | { type: "ADVANCE" }
    | { type: "BACK" }
    | { type: "JUMP_TO_STEP"; step: Step };

// Gate D placeholder note: steps 2-4 still use the generic ADVANCE stub
// until their own gates land. Step 1 is real (SELECT_CATEGORY/SELECT_SERVICE).
export function bookingReducer(state: BookingState, action: BookingAction): BookingState {
    switch (action.type) {
        case "SELECT_CATEGORY": {
            // Switching to a different category invalidates whatever service
            // (and its downstream slot) was picked under the old category.
            const changingCategory = state.category !== undefined && state.category !== action.category;
            return {
                ...state,
                category: action.category,
                ...(changingCategory
                    ? { serviceId: undefined, serviceName: undefined, slot: undefined }
                    : {}),
            };
        }
        case "SELECT_SERVICE":
            return {
                ...state,
                serviceId: action.serviceId,
                serviceName: action.serviceName,
                slot: undefined,
                step: 2,
            };
        case "ADVANCE": {
            const next: BookingState = { ...state };
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
