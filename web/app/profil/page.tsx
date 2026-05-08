"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Nav } from "@/components/landing/Nav";
import {
  getProfile,
  updateProfile,
  changeEmail,
  changePassword,
  ProfileData,
} from "@/lib/profile-api";
import { saveCustomerTokens } from "@/lib/customer-auth";

// ── Schemas ────────────────────────────────────────────────────────────────────

const profileSchema = z.object({
  firstName: z.string().min(1, "Ime je obavezno."),
  lastName: z.string().min(1, "Prezime je obavezno."),
  phoneNumber: z
    .string()
    .regex(
      /^(\+381|\+387|06)\d{5,11}$/,
      "Format: 0641234567 ili +381641234567"
    ),
});

const emailSchema = z.object({
  newEmail: z.string().email("Unesite ispravnu email adresu."),
  currentPassword: z.string().min(1, "Lozinka je obavezna."),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Lozinka je obavezna."),
    newPassword: z
      .string()
      .min(6, "Nova lozinka mora imati najmanje 6 karaktera."),
    confirmPassword: z.string().min(1, "Potvrdite novu lozinku."),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Lozinke se ne podudaraju.",
    path: ["confirmPassword"],
  });

type ProfileForm = z.infer<typeof profileSchema>;
type EmailForm = z.infer<typeof emailSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;

// ── Helpers ────────────────────────────────────────────────────────────────────

function Field({
  label,
  id,
  error,
  children,
}: {
  label: string;
  id: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="block text-sm font-medium text-[#0A0E27]"
      >
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="text-xs text-[#EF4444]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

const inputClass =
  "w-full border border-[#E8E6E0] rounded-md px-3 py-2 text-sm text-[#0A0E27] bg-white " +
  "focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-colors " +
  "disabled:bg-[#FAFAF7] disabled:text-[rgba(10,14,39,0.4)] disabled:cursor-not-allowed";

function CardSkeleton() {
  return (
    <div className="border border-[#E8E6E0] rounded-md p-6 bg-white animate-pulse space-y-4">
      <div className="h-3 bg-gray-100 rounded w-1/4" />
      <div className="h-5 bg-gray-100 rounded w-1/2" />
      <div className="space-y-3 mt-5">
        <div className="h-9 bg-gray-100 rounded" />
        <div className="h-9 bg-gray-100 rounded" />
        <div className="h-9 bg-gray-100 rounded" />
      </div>
    </div>
  );
}

// ── Section 1: Lični podaci ────────────────────────────────────────────────────

function PersonalSection({ profile }: { profile: ProfileData }) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: profile.firstName,
      lastName: profile.lastName,
      phoneNumber: profile.phoneNumber,
    },
  });

  async function onSubmit(data: ProfileForm) {
    setServerError(null);
    try {
      await updateProfile(data);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : "Greška na serveru.");
    }
  }

  return (
    <section className="border border-[#E8E6E0] rounded-md p-6 bg-white">
      <p className="font-mono text-xs text-[#2563EB] uppercase tracking-widest">
        01 / Lični podaci
      </p>
      <h2 className="mt-1.5 text-xl font-bold text-[#0A0E27]">
        Ime, prezime i telefon.
      </h2>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mt-6 space-y-4"
        noValidate
      >
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Ime" id="firstName" error={errors.firstName?.message}>
            <input
              id="firstName"
              autoComplete="given-name"
              aria-describedby={errors.firstName ? "firstName-error" : undefined}
              className={inputClass}
              {...register("firstName")}
            />
          </Field>
          <Field label="Prezime" id="lastName" error={errors.lastName?.message}>
            <input
              id="lastName"
              autoComplete="family-name"
              aria-describedby={errors.lastName ? "lastName-error" : undefined}
              className={inputClass}
              {...register("lastName")}
            />
          </Field>
        </div>

        <Field label="Telefon" id="phoneNumber" error={errors.phoneNumber?.message}>
          <input
            id="phoneNumber"
            type="tel"
            autoComplete="tel"
            placeholder="0641234567"
            aria-describedby={errors.phoneNumber ? "phoneNumber-error" : undefined}
            className={inputClass}
            {...register("phoneNumber")}
          />
        </Field>

        <Field label="Email adresa" id="emailDisabled">
          <input
            id="emailDisabled"
            type="email"
            value={profile.email}
            disabled
            className={inputClass}
          />
          <p className="text-xs text-[rgba(10,14,39,0.45)] mt-1">
            Email se menja u sledećoj sekciji.
          </p>
        </Field>

        {serverError && (
          <p className="text-sm text-[#EF4444]" role="alert">
            {serverError}
          </p>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          {saved && (
            <span className="flex items-center gap-1.5 text-sm text-green-600">
              <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 8l3.5 3.5L13 5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Sačuvano.
            </span>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-[#2563EB] text-white px-5 py-2 rounded-md text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? "Čuvam..." : "Sačuvaj izmene"}
          </button>
        </div>
      </form>
    </section>
  );
}

// ── Section 2: Email adresa ────────────────────────────────────────────────────

function EmailSection() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EmailForm>({
    resolver: zodResolver(emailSchema),
  });

  async function onSubmit(data: EmailForm) {
    setServerError(null);
    try {
      await changeEmail(data);
      setSaved(true);
      reset();
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : "Greška na serveru.");
    }
  }

  return (
    <section className="border border-[#E8E6E0] rounded-md p-6 bg-white">
      <p className="font-mono text-xs text-[#2563EB] uppercase tracking-widest">
        02 / Email
      </p>
      <h2 className="mt-1.5 text-xl font-bold text-[#0A0E27]">
        Promeni email adresu.
      </h2>
      <p className="mt-2 text-sm text-[rgba(10,14,39,0.6)]">
        Za promenu email adrese, unesi novu adresu i potvrdi trenutnom lozinkom.
      </p>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mt-6 space-y-4"
        noValidate
      >
        <Field label="Nova email adresa" id="newEmail" error={errors.newEmail?.message}>
          <input
            id="newEmail"
            type="email"
            autoComplete="email"
            placeholder="nova@email.com"
            aria-describedby={errors.newEmail ? "newEmail-error" : undefined}
            className={inputClass}
            {...register("newEmail")}
          />
        </Field>

        <Field label="Trenutna lozinka" id="emailCurrentPw" error={errors.currentPassword?.message}>
          <input
            id="emailCurrentPw"
            type="password"
            autoComplete="current-password"
            aria-describedby={errors.currentPassword ? "emailCurrentPw-error" : undefined}
            className={inputClass}
            {...register("currentPassword")}
          />
        </Field>

        {serverError && (
          <p className="text-sm text-[#EF4444]" role="alert">
            {serverError}
          </p>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          {saved && (
            <span className="flex items-center gap-1.5 text-sm text-green-600">
              <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 8l3.5 3.5L13 5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Email promenjen.
            </span>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-[#2563EB] text-white px-5 py-2 rounded-md text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? "Čuvam..." : "Promeni email"}
          </button>
        </div>
      </form>
    </section>
  );
}

// ── Section 3: Lozinka ────────────────────────────────────────────────────────

function PasswordSection() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
  });

  async function onSubmit(data: PasswordForm) {
    setServerError(null);
    try {
      const tokens = await changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      saveCustomerTokens(tokens.accessToken, tokens.refreshToken);
      setSaved(true);
      reset();
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : "Greška na serveru.");
    }
  }

  return (
    <section className="border border-[#E8E6E0] rounded-md p-6 bg-white">
      <p className="font-mono text-xs text-[#2563EB] uppercase tracking-widest">
        03 / Lozinka
      </p>
      <h2 className="mt-1.5 text-xl font-bold text-[#0A0E27]">
        Promeni lozinku.
      </h2>
      <p className="mt-2 text-sm text-[rgba(10,14,39,0.6)]">
        Posle promene lozinke, ostaćeš ulogovan na ovom uređaju, ali ćeš biti
        odjavljen sa svih ostalih uređaja.
      </p>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mt-6 space-y-4"
        noValidate
      >
        <Field
          label="Trenutna lozinka"
          id="currentPw"
          error={errors.currentPassword?.message}
        >
          <input
            id="currentPw"
            type="password"
            autoComplete="current-password"
            aria-describedby={errors.currentPassword ? "currentPw-error" : undefined}
            className={inputClass}
            {...register("currentPassword")}
          />
        </Field>

        <Field
          label="Nova lozinka"
          id="newPw"
          error={errors.newPassword?.message}
        >
          <input
            id="newPw"
            type="password"
            autoComplete="new-password"
            aria-describedby={errors.newPassword ? "newPw-error" : undefined}
            className={inputClass}
            {...register("newPassword")}
          />
        </Field>

        <Field
          label="Potvrdi novu lozinku"
          id="confirmPw"
          error={errors.confirmPassword?.message}
        >
          <input
            id="confirmPw"
            type="password"
            autoComplete="new-password"
            aria-describedby={errors.confirmPassword ? "confirmPw-error" : undefined}
            className={inputClass}
            {...register("confirmPassword")}
          />
        </Field>

        {serverError && (
          <p className="text-sm text-[#EF4444]" role="alert">
            {serverError}
          </p>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          {saved && (
            <span className="flex items-center gap-1.5 text-sm text-green-600">
              <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 8l3.5 3.5L13 5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Lozinka promenjena.
            </span>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-[#2563EB] text-white px-5 py-2 rounded-md text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? "Čuvam..." : "Promeni lozinku"}
          </button>
        </div>
      </form>
    </section>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function ProfilPage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    getProfile()
      .then(setProfile)
      .catch(() => setLoadError("Nije moguće učitati profil. Pokušaj ponovo."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <Nav />
      <main className="min-h-screen bg-[#FAFAF7] pt-24 pb-12">
        <div className="max-w-[720px] mx-auto px-6">
          {/* Page header */}
          <div className="mb-12">
            <h1 className="text-[40px] font-bold text-[#0A0E27] tracking-tight leading-tight">
              Moj profil
            </h1>
            <p
              className="mt-2 text-base text-[rgba(10,14,39,0.6)]"
              style={{ lineHeight: "1.6" }}
            >
              Uredi svoje podatke i bezbednosna podešavanja.
            </p>
          </div>

          {/* Content */}
          {loadError ? (
            <div className="border border-[#E8E6E0] rounded-md p-6 bg-white">
              <p className="text-sm text-[#EF4444]">{loadError}</p>
            </div>
          ) : (
            <div className="space-y-6">
              {loading || !profile ? (
                <>
                  <CardSkeleton />
                  <CardSkeleton />
                  <CardSkeleton />
                </>
              ) : (
                <>
                  <PersonalSection profile={profile} />
                  <EmailSection />
                  <PasswordSection />
                </>
              )}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
