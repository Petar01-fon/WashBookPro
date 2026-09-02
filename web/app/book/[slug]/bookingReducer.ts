export type Step = 1 | 2 | 3 | 4;

export interface BookingSlot {
    bayId: string;
    bayName: string;
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

// The five step-3 inputs are homogeneous plain-text controlled fields with no
// cross-field side effects (unlike category/date, which cascade resets elsewhere) —
// one generic setter instead of five near-identical actions/reducer cases.
export type BookingTextField = "customerName" | "customerPhone" | "customerEmail" | "notes" | "plateNumber";

export type BookingAction =
    | { type: "SELECT_CATEGORY"; category: string }
    | { type: "SELECT_SERVICE"; serviceId: string; serviceName: string }
    | { type: "SELECT_DATE"; date: string }
    | { type: "SELECT_SLOT"; bayId: string; bayName: string; startsAt: string }
    | { type: "SET_FIELD"; field: BookingTextField; value: string }
    | { type: "PREFILL_CUSTOMER"; name: string; phone: string; email: string }
    | { type: "ADVANCE" }
    | { type: "BACK" }
    | { type: "JUMP_TO_STEP"; step: Step };

// Gate D placeholder note: step 4 still uses the generic ADVANCE stub
// until its own gate lands. Steps 1-3 are real.
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
        case "SELECT_DATE": {
            // Availability depends on the date, so a changed date invalidates
            // whatever slot was already picked for the old date.
            const changingDate = state.date !== undefined && state.date !== action.date;
            return {
                ...state,
                date: action.date,
                ...(changingDate ? { slot: undefined } : {}),
            };
        }
        case "SELECT_SLOT":
            return {
                ...state,
                slot: { bayId: action.bayId, bayName: action.bayName, startsAt: action.startsAt },
                step: 3,
            };
        case "SET_FIELD":
            return { ...state, [action.field]: action.value };
        case "PREFILL_CUSTOMER":
            // Only fills currently-empty fields — never overwrites what the
            // customer already typed, even if this fires after they start editing.
            return {
                ...state,
                customerName: state.customerName ?? action.name,
                customerPhone: state.customerPhone ?? action.phone,
                customerEmail: state.customerEmail ?? action.email,
            };
        case "ADVANCE": {
            const next: BookingState = { ...state };
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
