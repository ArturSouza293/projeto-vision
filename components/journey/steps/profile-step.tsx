"use client";

import { useEffect, useRef } from "react";
import { useForm, type Control, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { z } from "zod";

import { StepHeader } from "@/components/journey/step-header";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ageFromDob } from "@/lib/calc";
import { useVisionStore } from "@/lib/store/plan-store";
import type {
  EmploymentStatus,
  Gender,
  MaritalStatus,
  Segment,
} from "@/lib/types";

const schema = z.object({
  firstName: z.string().min(1, "Required"),
  lastName: z.string().optional(),
  dateOfBirth: z.string().min(1, "Required"),
  gender: z.enum(["female", "male", "other", "undisclosed"]),
  maritalStatus: z.enum([
    "single",
    "married",
    "stable_union",
    "divorced",
    "widowed",
  ]),
  dependents: z.number().int().min(0).max(20),
  hasPartner: z.boolean(),
  partnerName: z.string().optional(),
  employmentStatus: z.enum([
    "clt",
    "pj",
    "self_employed",
    "civil_servant",
    "retired",
    "business_owner",
  ]),
  occupation: z.string().optional(),
  email: z.union([z.literal(""), z.string().email("Invalid email")]).optional(),
  phone: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  taxResidency: z.string().min(1),
  cpfMasked: z.string().optional(),
  pep: z.boolean(),
  segment: z.enum(["retail", "prime", "principal", "private"]),
});

type FormValues = z.infer<typeof schema>;

function TextField({
  control,
  name,
  label,
  type,
  placeholder,
}: {
  control: Control<FormValues>;
  name: FieldPath<FormValues>;
  label: string;
  type?: string;
  placeholder?: string;
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input
              type={type}
              placeholder={placeholder}
              {...field}
              value={typeof field.value === "string" ? field.value : ""}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function SelectField({
  control,
  name,
  label,
  options,
}: {
  control: Control<FormValues>;
  name: FieldPath<FormValues>;
  label: string;
  options: { value: string; label: string }[];
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <Select value={String(field.value)} onValueChange={field.onChange}>
            <FormControl>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {options.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function ProfileStep() {
  const t = useTranslations();
  const updateClientProfile = useVisionStore((s) => s.updateClientProfile);
  const initial = useRef(
    useVisionStore.getState().activePlan!.clientProfile,
  ).current;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: {
      firstName: initial.firstName,
      lastName: initial.lastName ?? "",
      dateOfBirth: initial.dateOfBirth,
      gender: initial.gender,
      maritalStatus: initial.maritalStatus,
      dependents: initial.dependents,
      hasPartner: initial.hasPartner,
      partnerName: initial.partnerName ?? "",
      employmentStatus: initial.employmentStatus,
      occupation: initial.occupation ?? "",
      email: initial.email ?? "",
      phone: initial.phone ?? "",
      city: initial.city ?? "",
      state: initial.state ?? "",
      taxResidency: initial.taxResidency,
      cpfMasked: initial.cpfMasked ?? "",
      pep: initial.pep,
      segment: initial.segment,
    },
  });

  const { control, watch } = form;
  const hasPartner = watch("hasPartner");
  const dob = watch("dateOfBirth");

  useEffect(() => {
    // react-hook-form's watch() can't be memoized by React Compiler; safe here —
    // it only syncs form values into the store, not into other memoized hooks.
    // eslint-disable-next-line react-hooks/incompatible-library
    const sub = watch((v) => {
      updateClientProfile({
        firstName: v.firstName ?? "",
        lastName: v.lastName || undefined,
        dateOfBirth: v.dateOfBirth ?? "",
        gender: v.gender as Gender,
        maritalStatus: v.maritalStatus as MaritalStatus,
        dependents: Number(v.dependents ?? 0),
        hasPartner: !!v.hasPartner,
        partnerName: v.partnerName || undefined,
        employmentStatus: v.employmentStatus as EmploymentStatus,
        occupation: v.occupation || undefined,
        email: v.email || undefined,
        phone: v.phone || undefined,
        city: v.city || undefined,
        state: v.state || undefined,
        taxResidency: v.taxResidency || "BR",
        cpfMasked: v.cpfMasked || undefined,
        pep: !!v.pep,
        segment: v.segment as Segment,
      });
    });
    return () => sub.unsubscribe();
  }, [watch, updateClientProfile]);

  const opt = (ns: string, values: string[]) =>
    values.map((v) => ({ value: v, label: t(`${ns}.${v}`) }));

  return (
    <div>
      <StepHeader title={t("profile.title")} subtitle={t("profile.subtitle")} />

      <Form {...form}>
        <form className="space-y-5">
          <section className="rounded-2xl border border-border bg-card p-5">
            <h3 className="mb-4 text-sm font-semibold text-foreground">
              {t("profile.section.personal")}
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField control={control} name="firstName" label={t("profile.field.firstName")} />
              <TextField control={control} name="lastName" label={t("profile.field.lastName")} />
              <TextField control={control} name="dateOfBirth" label={t("profile.field.dateOfBirth")} type="date" />
              <SelectField
                control={control}
                name="gender"
                label={t("profile.field.gender")}
                options={opt("gender", ["female", "male", "other", "undisclosed"])}
              />
              <SelectField
                control={control}
                name="maritalStatus"
                label={t("profile.field.maritalStatus")}
                options={opt("marital", ["single", "married", "stable_union", "divorced", "widowed"])}
              />
              <FormField
                control={control}
                name="dependents"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("profile.field.dependents")}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        value={Number.isFinite(field.value) ? field.value : 0}
                        onChange={(e) =>
                          field.onChange(
                            Number.isNaN(e.target.valueAsNumber) ? 0 : e.target.valueAsNumber,
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <h3 className="mt-6 mb-4 text-sm font-semibold text-foreground">
              {t("profile.section.employment")}
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                control={control}
                name="employmentStatus"
                label={t("profile.field.employmentStatus")}
                options={opt("employment", ["clt", "pj", "self_employed", "civil_servant", "retired", "business_owner"])}
              />
              <TextField control={control} name="occupation" label={t("profile.field.occupation")} />
            </div>

            <h3 className="mt-6 mb-4 text-sm font-semibold text-foreground">
              {t("profile.section.contact")}
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField control={control} name="email" label={t("profile.field.email")} type="email" />
              <TextField control={control} name="phone" label={t("profile.field.phone")} />
              <TextField control={control} name="city" label={t("profile.field.city")} />
              <TextField control={control} name="state" label={t("profile.field.state")} />
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5">
              <h3 className="mb-4 text-sm font-semibold text-foreground">
                {t("profile.section.household")}
              </h3>
              <div className="space-y-4">
                <FormField
                  control={control}
                  name="hasPartner"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border border-border p-3">
                      <FormLabel className="font-normal">{t("profile.field.hasPartner")}</FormLabel>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                {hasPartner && (
                  <TextField control={control} name="partnerName" label={t("profile.field.partnerName")} />
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-card p-5">
              <h3 className="mb-4 text-sm font-semibold text-foreground">
                {t("profile.section.tax")}
              </h3>
              <div className="space-y-4">
                <SelectField
                  control={control}
                  name="segment"
                  label={t("profile.field.segment")}
                  options={opt("segment", ["retail", "prime", "principal", "private"])}
                />
                <TextField control={control} name="taxResidency" label={t("profile.field.taxResidency")} />
                <TextField control={control} name="cpfMasked" label={t("profile.field.cpf")} />
                <FormField
                  control={control}
                  name="pep"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border border-border p-3">
                      <FormLabel className="font-normal">{t("profile.field.pep")}</FormLabel>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              {dob && (
                <p className="mt-4 text-xs text-muted-foreground">
                  {t("common.age")}: <span className="font-medium text-foreground">{ageFromDob(dob)}</span>
                </p>
              )}
            </section>
        </form>
      </Form>
    </div>
  );
}
