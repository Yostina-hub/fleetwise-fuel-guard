/**
 * InviteUserDialog — Create New User
 * ----------------------------------
 * Hardened form with:
 *  - Zod schema validation (single source of truth, client-side)
 *  - Input sanitization (control-char strip, trim, lowercase email)
 *  - Per-field inline errors (touched on blur, all on submit)
 *  - Password strength meter + show/hide toggle + generator
 *  - Submission throttle (anti-batch)
 *  - No sensitive data logged
 *  - All semantic tokens (no raw colors)
 */
import { useMemo, useState } from "react";
import { z } from "zod";
import { useSubmitThrottle } from "@/hooks/useSubmitThrottle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  RefreshCw,
  ShieldCheck,
  UserPlus,
  IdCard,
} from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { useOrganization } from "@/hooks/useOrganization";
import { cn } from "@/lib/utils";
import { APP_ROLES, ROLES_BY_GROUP, type AppRole } from "@/lib/workflow-engine/appRoles";
import CreateDriverDialog from "@/components/fleet/CreateDriverDialog";

/* ---------------------------------------------------------------- */
/*  Sanitization helpers                                            */
/* ---------------------------------------------------------------- */

/** Strip ASCII control chars (except \n, \t) and trim. */
const sanitizeText = (v: string): string =>
  v.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").trim();

/** Email: lowercase + strip whitespace + control chars. */
const sanitizeEmail = (v: string): string =>
  sanitizeText(v).toLowerCase().replace(/\s+/g, "");

/** Full name: collapse internal whitespace, allow letters/spaces/'-./. */
const sanitizeFullName = (v: string): string =>
  sanitizeText(v).replace(/\s+/g, " ").slice(0, 100);

/* ---------------------------------------------------------------- */
/*  Zod schema                                                      */
/* ---------------------------------------------------------------- */

/** Roles whitelisted by the create-user edge function (mirrors validateEnum). */
const ROLE_VALUES = APP_ROLES.map((r) => r.value) as [AppRole, ...AppRole[]];

/** Roles only super_admin may assign (admin tier). */
const ADMIN_ONLY_ROLES: ReadonlySet<AppRole> = new Set(["super_admin", "org_admin"]);

const NAME_REGEX = /^[\p{L}][\p{L}\s'.-]{0,99}$/u;

const inviteUserSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Enter a valid email address (e.g. user@example.com)")
    .max(255, "Email must be 255 characters or fewer"),
  fullName: z
    .string()
    .min(1, "Full name cannot be empty")
    .min(2, "Full name must be at least 2 characters")
    .max(100, "Full name must be 100 characters or fewer")
    .refine(
      (v) => NAME_REGEX.test(v),
      "Full name may only contain letters, spaces, hyphens, apostrophes, and periods",
    ),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password must be 72 characters or fewer")
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[a-z]/, "Password must contain a lowercase letter")
    .regex(/[0-9]/, "Password must contain a digit")
    .regex(/[^A-Za-z0-9]/, "Password must contain a special character"),
  role: z.enum(ROLE_VALUES, {
    errorMap: () => ({ message: "Select a role for this user" }),
  }),
});

type FieldErrors = Partial<Record<keyof z.infer<typeof inviteUserSchema>, string>>;

/* ---------------------------------------------------------------- */
/*  Component                                                       */
/* ---------------------------------------------------------------- */

interface InviteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserCreated: () => void;
  organizationId?: string;
}

const InviteUserDialog = ({
  open,
  onOpenChange,
  onUserCreated,
  organizationId: propOrgId,
}: InviteUserDialogProps) => {
  const { toast } = useToast();
  const { isSuperAdmin } = usePermissions();
  const { organizationId: contextOrgId } = useOrganization();
  const effectiveOrgId = propOrgId || contextOrgId;
  const canSubmitNow = useSubmitThrottle();

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  /** Roles the current actor is allowed to assign (admin-only roles hidden from non-super_admin),
   *  grouped by tier so the dropdown stays scannable when there are 20+ roles. */
  const visibleGroups = useMemo(() => {
    const groupOrder = ["Administration", "Management", "Operations", "Field", "Read-only"] as const;
    return groupOrder
      .map((g) => ({
        group: g,
        roles: (ROLES_BY_GROUP[g] ?? []).filter(
          (r) => isSuperAdmin || !ADMIN_ONLY_ROLES.has(r.value),
        ),
      }))
      .filter((g) => g.roles.length > 0);
  }, [isSuperAdmin]);

  /* ---- validation ---- */
  const validateField = (
    field: keyof FieldErrors,
    values: { email: string; fullName: string; password: string; role: string },
  ): string | undefined => {
    const partial =
      field === "email"
        ? { email: values.email }
        : field === "fullName"
          ? { fullName: values.fullName }
          : field === "password"
            ? { password: values.password }
            : { role: values.role };
    const schemaPart = inviteUserSchema.pick({ [field]: true } as any);
    const result = schemaPart.safeParse(partial);
    if (result.success) return undefined;
    return result.error.errors[0]?.message;
  };

  const handleBlur = (field: keyof FieldErrors) => {
    setTouched((p) => ({ ...p, [field]: true }));
    const msg = validateField(field, {
      email,
      fullName,
      password,
      role: selectedRole,
    });
    setErrors((p) => {
      const next = { ...p };
      if (msg) next[field] = msg;
      else delete next[field];
      return next;
    });
  };

  const updateField = (
    field: keyof FieldErrors,
    raw: string,
    setter: (v: string) => void,
    sanitize: (v: string) => string = sanitizeText,
  ) => {
    const clean = sanitize(raw);
    setter(clean);
    if (touched[field]) {
      const msg = validateField(field, {
        email: field === "email" ? clean : email,
        fullName: field === "fullName" ? clean : fullName,
        password: field === "password" ? clean : password,
        role: field === "role" ? clean : selectedRole,
      });
      setErrors((p) => {
        const next = { ...p };
        if (msg) next[field] = msg;
        else delete next[field];
        return next;
      });
    }
  };

  /* ---- password generator ---- */
  const generatePassword = () => {
    const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    const lower = "abcdefghijkmnopqrstuvwxyz";
    const digits = "23456789";
    const special = "!@#$%^&*()-_=+";
    const all = upper + lower + digits + special;
    const arr = new Uint32Array(16);
    crypto.getRandomValues(arr);
    let pwd =
      upper[arr[0] % upper.length] +
      lower[arr[1] % lower.length] +
      digits[arr[2] % digits.length] +
      special[arr[3] % special.length];
    for (let i = 4; i < 16; i++) pwd += all[arr[i] % all.length];
    pwd = pwd
      .split("")
      .sort(() => Math.random() - 0.5)
      .join("");
    setPassword(pwd);
    setShowPassword(true);
    setTouched((p) => ({ ...p, password: true }));
    setErrors((p) => {
      const n = { ...p };
      delete n.password;
      return n;
    });
  };

  const resetForm = () => {
    setEmail("");
    setFullName("");
    setPassword("");
    setSelectedRole("");
    setErrors({});
    setTouched({});
    setShowPassword(false);
  };

  /* ---- submit ---- */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanEmail = sanitizeEmail(email);
    const cleanName = sanitizeFullName(fullName);
    const payload = {
      email: cleanEmail,
      fullName: cleanName,
      password,
      role: selectedRole,
    };

    const result = inviteUserSchema.safeParse(payload);
    if (!result.success) {
      const fe: FieldErrors = {};
      result.error.errors.forEach((err) => {
        const f = err.path[0] as keyof FieldErrors;
        if (f && !fe[f]) fe[f] = err.message;
      });
      setErrors(fe);
      setTouched({ email: true, fullName: true, password: true, role: true });
      toast({
        title: "Please fix the errors",
        description: Object.values(fe)[0] ?? "Form contains invalid data",
        variant: "destructive",
      });
      return;
    }

    if (!effectiveOrgId) {
      toast({
        title: "Organization missing",
        description: "Cannot create a user without an organization context.",
        variant: "destructive",
      });
      return;
    }

    if (!canSubmitNow()) {
      toast({
        title: "Please wait",
        description: "Slow down — please wait a moment before submitting again.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Your session has expired. Please sign in again.");

      const { data, error } = await supabase.functions.invoke("create-user", {
        body: {
          email: result.data.email,
          password: result.data.password,
          fullName: result.data.fullName || undefined,
          role: result.data.role,
          organizationId: effectiveOrgId,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.warning) {
        toast({
          title: "User created with warning",
          description: `${data.warning}. Please assign role manually.`,
        });
      } else {
        toast({
          title: "User created",
          description: `${result.data.email} has been added successfully.`,
        });
      }

      resetForm();
      onOpenChange(false);
      onUserCreated();
    } catch (err: any) {
      // Never log the password
      const msg = err?.message ?? "Failed to create user";
      toast({
        title: "Error creating user",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  /* ---- password strength ---- */
  const pwdChecks = [
    { label: "8+ chars", ok: password.length >= 8 },
    { label: "Uppercase", ok: /[A-Z]/.test(password) },
    { label: "Lowercase", ok: /[a-z]/.test(password) },
    { label: "Digit", ok: /[0-9]/.test(password) },
    { label: "Special", ok: /[^A-Za-z0-9]/.test(password) },
  ];
  const pwdScore = pwdChecks.filter((c) => c.ok).length;
  const pwdPct = (pwdScore / pwdChecks.length) * 100;
  const pwdTone =
    pwdScore <= 2
      ? "bg-destructive"
      : pwdScore === 3
        ? "bg-warning"
        : pwdScore === 4
          ? "bg-warning"
          : "bg-success";

  /* ---- field helpers ---- */
  const fieldStatus = (field: keyof FieldErrors, value: string) => {
    if (errors[field] && touched[field]) return "error" as const;
    if (touched[field] && value) return "success" as const;
    return "idle" as const;
  };

  const inputClass = (status: "idle" | "error" | "success") =>
    cn(
      status === "error" && "border-destructive focus-visible:ring-destructive",
      status === "success" && "border-success/60 focus-visible:ring-success/40",
    );

  return (
    <>
    {/* When the actor selects "driver", we delegate to the full driver wizard
        (CreateDriverDialog) so that legal IDs, license, attachments, emergency
        contact, etc. are captured. The invite dialog hides itself while the
        driver dialog is open and re-opens on cancel. */}
    {selectedRole === "driver" && open && (
      <CreateDriverDialog
        open
        onOpenChange={(o) => {
          if (!o) {
            // User closed the driver wizard — reset role so they don't get
            // bounced straight back into it on the next open.
            setSelectedRole("");
          }
        }}
        onSubmitted={() => {
          resetForm();
          onOpenChange(false);
          onUserCreated();
        }}
      />
    )}
    <Dialog
      open={open && selectedRole !== "driver"}
      onOpenChange={(o) => {
        if (!o) resetForm();
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <UserPlus className="h-5 w-5 text-primary" aria-hidden="true" />
            </div>
            <div>
              <DialogTitle>Create New User</DialogTitle>
              <DialogDescription>
                Provision a new account and assign a role.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2" noValidate>
          {/* Top-of-dialog error summary — visible after the user attempts to
              submit and any field has a validation error. Mirrors the
              standardized pattern used across the rest of the form dialogs. */}
          {(() => {
            const visibleErrorCount = (Object.keys(errors) as Array<keyof FieldErrors>).filter(
              (k) => touched[k] && errors[k],
            ).length;
            if (visibleErrorCount === 0) return null;
            return (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>
                  {visibleErrorCount === 1
                    ? "1 field needs your attention before you can create this user."
                    : `${visibleErrorCount} fields need your attention before you can create this user.`}
                </span>
              </div>
            );
          })()}

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="invite-email">
              Email <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Input
                id="invite-email"
                type="email"
                inputMode="email"
                autoComplete="off"
                placeholder="user@example.com"
                value={email}
                maxLength={255}
                onChange={(e) =>
                  updateField("email", e.target.value, setEmail, sanitizeEmail)
                }
                onBlur={() => handleBlur("email")}
                aria-invalid={!!errors.email && touched.email}
                aria-describedby={errors.email && touched.email ? "invite-email-error" : undefined}
                className={inputClass(fieldStatus("email", email))}
                required
              />
              {fieldStatus("email", email) === "success" && (
                <CheckCircle2
                  className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-success"
                  aria-hidden="true"
                />
              )}
            </div>
            {errors.email && touched.email && (
              <p
                id="invite-email-error"
                className="flex items-center gap-1.5 text-xs text-destructive"
                role="alert"
              >
                <AlertCircle className="h-3 w-3 shrink-0" aria-hidden="true" />
                {errors.email}
              </p>
            )}
          </div>

          {/* Full name */}
          <div className="space-y-1.5">
            <Label htmlFor="invite-fullname">Full Name <span className="text-destructive">*</span></Label>
            <Input
              id="invite-fullname"
              type="text"
              autoComplete="off"
              placeholder="Jane Doe"
              value={fullName}
              maxLength={100}
              onChange={(e) =>
                updateField("fullName", e.target.value, setFullName, sanitizeFullName)
              }
              onBlur={() => handleBlur("fullName")}
              aria-invalid={!!errors.fullName && touched.fullName}
              aria-describedby={
                errors.fullName && touched.fullName ? "invite-fullname-error" : undefined
              }
              className={inputClass(fieldStatus("fullName", fullName))}
            />
            {errors.fullName && touched.fullName && (
              <p
                id="invite-fullname-error"
                className="flex items-center gap-1.5 text-xs text-destructive"
                role="alert"
              >
                <AlertCircle className="h-3 w-3 shrink-0" aria-hidden="true" />
                {errors.fullName}
              </p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="invite-password">
                Password <span className="text-destructive">*</span>
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
                onClick={generatePassword}
              >
                <RefreshCw className="h-3 w-3" aria-hidden="true" />
                Generate
              </Button>
            </div>
            <div className="relative">
              <Input
                id="invite-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="At least 8 characters with mixed case, digit & symbol"
                value={password}
                maxLength={72}
                onChange={(e) => updateField("password", e.target.value, setPassword)}
                onBlur={() => handleBlur("password")}
                aria-invalid={!!errors.password && touched.password}
                aria-describedby={
                  errors.password && touched.password
                    ? "invite-password-error"
                    : "invite-password-meter"
                }
                className={cn(inputClass(fieldStatus("password", password)), "pr-10")}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>

            {/* Strength meter */}
            {password && (
              <div id="invite-password-meter" className="space-y-1.5 mt-1">
                <div
                  className="h-1 rounded-full bg-muted overflow-hidden"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={pwdPct}
                  aria-label="Password strength"
                >
                  <div
                    className={cn("h-full transition-all duration-300", pwdTone)}
                    style={{ width: `${pwdPct}%` }}
                  />
                </div>
                <div className="flex flex-wrap gap-1">
                  {pwdChecks.map((c) => (
                    <span
                      key={c.label}
                      className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded border transition-colors",
                        c.ok
                          ? "border-success/40 text-success bg-success/5"
                          : "border-border text-muted-foreground bg-muted/40",
                      )}
                    >
                      {c.ok ? "✓" : "·"} {c.label}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {errors.password && touched.password && (
              <p
                id="invite-password-error"
                className="flex items-center gap-1.5 text-xs text-destructive"
                role="alert"
              >
                <AlertCircle className="h-3 w-3 shrink-0" aria-hidden="true" />
                {errors.password}
              </p>
            )}
          </div>

          {/* Role */}
          <div className="space-y-1.5">
            <Label htmlFor="invite-role">
              Role <span className="text-destructive">*</span>
            </Label>
            <Select
              value={selectedRole}
              onValueChange={(v) => {
                setSelectedRole(v);
                if (touched.role) {
                  const msg = validateField("role", {
                    email,
                    fullName,
                    password,
                    role: v,
                  });
                  setErrors((p) => {
                    const n = { ...p };
                    if (msg) n.role = msg;
                    else delete n.role;
                    return n;
                  });
                }
              }}
            >
              <SelectTrigger
                id="invite-role"
                aria-label="Select role"
                aria-invalid={!!errors.role && touched.role}
                aria-describedby={
                  errors.role && touched.role ? "invite-role-error" : undefined
                }
                onBlur={() => handleBlur("role")}
                className={inputClass(fieldStatus("role", selectedRole))}
              >
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent className="max-h-[320px]">
                {visibleGroups.map((g) => (
                  <SelectGroup key={g.group}>
                    <SelectLabel className="text-[10px] uppercase tracking-wider text-muted-foreground/80">
                      {g.group}
                    </SelectLabel>
                    {g.roles.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        <div className="flex flex-col">
                          <span>{role.label}</span>
                          {role.description && (
                            <span className="text-[10px] text-muted-foreground">
                              {role.description}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
            {errors.role && touched.role && (
              <p
                id="invite-role-error"
                className="flex items-center gap-1.5 text-xs text-destructive"
                role="alert"
              >
                <AlertCircle className="h-3 w-3 shrink-0" aria-hidden="true" />
                {errors.role}
              </p>
            )}
          </div>

          {/* Security note */}
          <div className="flex items-start gap-2 rounded-md border border-border bg-muted/30 px-3 py-2">
            <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Inputs are sanitized and validated before submission. The user will receive
              login credentials once created.
            </p>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetForm();
                onOpenChange(false);
              }}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                loading ||
                !email.trim() ||
                !fullName.trim() ||
                !password ||
                !selectedRole ||
                Object.keys(errors).length > 0
              }
              className="gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Creating…
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" aria-hidden="true" />
                  Create User
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    </>
  );
};

export default InviteUserDialog;
