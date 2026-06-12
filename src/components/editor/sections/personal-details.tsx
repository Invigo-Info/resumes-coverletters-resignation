"use client";

import { useRef, useState } from "react";
import { Plus, Minus, Camera, X } from "lucide-react";
import { useResumeStore } from "@/lib/store/resume-store";
import { Field, FieldWrap, SectionHeading } from "./field";
import { BirthDatePicker } from "./birth-date-picker";
import { AutocompleteInput } from "./autocomplete-input";
import { JOB_TITLES } from "@/lib/suggestions";

export function PersonalDetailsForm() {
  const personal = useResumeStore((s) => s.personal);
  const setPersonal = useResumeStore((s) => s.setPersonal);
  const [showMore, setShowMore] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPersonal({ photo: reader.result as string });
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  return (
    <div>
      <SectionHeading
        title="Personal details"
        description="Fill in your details and the job title you are aiming for to make a clear first impression."
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field
          label="First name"
          value={personal.firstName}
          onChange={(v) => setPersonal({ firstName: v })}
          placeholder="John"
        />
        <Field
          label="Last name"
          value={personal.lastName}
          onChange={(v) => setPersonal({ lastName: v })}
          placeholder="Smith"
        />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
        <FieldWrap label="Desired job title">
          <AutocompleteInput
            value={personal.jobTitle}
            onChange={(v) => setPersonal({ jobTitle: v })}
            placeholder="Account Manager"
            options={JOB_TITLES}
            aiKind="jobTitle"
          />
        </FieldWrap>

        {/* Add photo */}
        <div className="flex items-end gap-4">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="group relative grid size-13 shrink-0 place-items-center overflow-hidden rounded-xl bg-muted text-muted-foreground transition-colors hover:bg-muted/70"
            aria-label={personal.photo ? "Change photo" : "Add photo"}
          >
            {personal.photo ? (
              <img
                src={personal.photo}
                alt="Profile"
                className="size-full object-cover"
              />
            ) : (
              <Camera className="size-5" />
            )}
          </button>
          <div className="pb-1.5 leading-tight">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="font-semibold text-foreground hover:underline"
            >
              {personal.photo ? "Change photo" : "Add photo"}
            </button>
            {personal.photo && (
              <button
                type="button"
                onClick={() => setPersonal({ photo: undefined })}
                className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-destructive"
              >
                <X className="size-3.5" />
                Remove
              </button>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={onPhoto}
            className="hidden"
          />
        </div>
      </div>

      {/* Additional details */}
      <button
        onClick={() => setShowMore((v) => !v)}
        className="mt-6 flex w-full items-center gap-3 rounded-xl bg-muted px-5 py-4 text-left font-semibold text-foreground transition-colors hover:bg-muted/70"
      >
        {showMore ? <Minus className="size-5" /> : <Plus className="size-5" />}
        {showMore ? "Hide additional details" : "Show additional details"}
      </button>

      {showMore && (
        <div className="mt-5 space-y-5">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field
              label="Nationality"
              value={personal.nationality}
              onChange={(v) => setPersonal({ nationality: v })}
              placeholder="American"
            />
            <Field
              label="Driver license"
              value={personal.driverLicense}
              onChange={(v) => setPersonal({ driverLicense: v })}
              placeholder="Class C"
            />
          </div>
          <div className="sm:w-1/2 sm:pr-2.5">
            <FieldWrap label="Birth date">
              <BirthDatePicker
                value={personal.birthDate}
                onChange={(v) => setPersonal({ birthDate: v })}
                placeholder="03 Feb 1996"
              />
            </FieldWrap>
          </div>
        </div>
      )}
    </div>
  );
}
