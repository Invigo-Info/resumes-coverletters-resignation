"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Plus, Minus, Camera, Info, SlidersHorizontal, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useResumeStore } from "@/lib/store/resume-store";
import { downscaleImage } from "@/services/storage/downscale-image";
import { nameError, sanitizeName } from "@/validation/validate-name";
import {
  hidesPhoto,
  PHOTO_ACCEPT,
  PHOTO_MIME,
  PHOTO_MAX_BYTES,
  PHOTO_MIN_EDGE,
  PHOTO_HIDDEN_REASON,
} from "@/validation/photo-policy";
import { Field, FieldWrap, SectionHeading } from "./field";
import { BirthDatePicker } from "./birth-date-picker";
import { AutocompleteInput } from "./autocomplete-input";
import { ConfigurePhotoDialog } from "./configure-photo-dialog";
import { JOB_TITLES } from "@/utilities/suggestions";

/** Read a File's pixel dimensions (0x0 if the browser cannot decode it). */
function imageSize(file: File): Promise<{ w: number; h: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ w: img.naturalWidth, h: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ w: 0, h: 0 });
    };
    img.src = url;
  });
}

/**
 * Derive first / last name from the signed-in account: prefer the display name,
 * fall back to the email's local part ("john.mayer@x.com" -> John Mayer). Splits
 * on spaces (name) or . _ + - (email), title-cases each word, and drops any
 * trailing digits.
 */
function nameFromAccount(
  name?: string | null,
  email?: string | null
): { firstName: string; lastName: string } {
  const source = name?.trim()
    ? name.trim().split(/\s+/)
    : (email?.split("@")[0] ?? "").split(/[._+-]+/);
  const words = source
    .map((w) => w.replace(/\d+$/, "").trim())
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
  return { firstName: words[0] ?? "", lastName: words.slice(1).join(" ") };
}

/**
 * Editor section for name, job title, photo and optional extra details
 * (nationality, license, birth date behind a "show more" toggle).
 *
 * First and last name are required and accept letters only. The photo is
 * optional and is hidden entirely for US / UK / Ireland applications.
 */
export function PersonalDetailsForm() {
  const personal = useResumeStore((s) => s.personal);
  const setPersonal = useResumeStore((s) => s.setPersonal);
  const setContact = useResumeStore((s) => s.setContact);
  const location = useResumeStore((s) => s.contact.location);
  const { data: session } = useSession();
  const seededName = useRef(false);
  // Toggle for the collapsible "additional details" block.
  const [showMore, setShowMore] = useState(false);
  // Errors surface only after a field has been left, never mid-typing.
  const [touched, setTouched] = useState({ firstName: false, lastName: false });
  // "Configure photo" dialog: open, plus the accepted image as an object URL
  // (null while its drop zone is showing) and a flag while we validate a pick.
  const [photoOpen, setPhotoOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const photoHidden = hidesPhoto(location);

  // Open the disclosure on arrival when it already holds content - a set photo,
  // or optional fields brought in by a resume import (nationality, license,
  // birth date). Otherwise those imported values, and the avatar's Remove
  // button, are unreachable for a user who doesn't know to expand. Runs after
  // mount so the collapsed server markup and the first client render still agree.
  useEffect(() => {
    const p = useResumeStore.getState().personal;
    if (
      p.photo ||
      p.nationality.trim() ||
      p.driverLicense.trim() ||
      p.birthDate.trim()
    ) {
      setShowMore(true);
    }
  }, []);

  // Prefill name + email from the signed-in account so the preview shows them
  // straight after a template is picked. Name comes from the account's display
  // name (or the email's local part). Both seed only an EMPTY field - never
  // overwriting what the user typed or a resume import - and only once, once the
  // session has loaded.
  useEffect(() => {
    if (seededName.current) return;
    const name = session?.user?.name;
    const email = session?.user?.email;
    if (!name && !email) return; // session not ready yet
    seededName.current = true;
    const state = useResumeStore.getState();
    // Email -> empty contact field (mirrors the Contact section's prefill).
    if (email && !state.contact.email.trim()) setContact({ email });
    // First/last name -> empty name only.
    if (!state.personal.firstName.trim() && !state.personal.lastName.trim()) {
      const { firstName, lastName } = nameFromAccount(name, email);
      if (firstName || lastName) {
        setPersonal({
          firstName: sanitizeName(firstName),
          lastName: sanitizeName(lastName),
        });
      }
    }
  }, [session, setPersonal, setContact]);

  // Release the object URL when the dialog closes or the component unmounts.
  useEffect(() => {
    return () => {
      if (cropSrc) URL.revokeObjectURL(cropSrc);
    };
  }, [cropSrc]);

  /**
   * Open the Configure dialog. With a photo already set, seed the crop stage
   * with it (so Configure lands straight on the round-crop view, not the empty
   * drop zone); otherwise open on the drop zone to pick a new one.
   */
  function openPhoto() {
    setCropSrc(personal.photo ?? null);
    setPhotoOpen(true);
  }

  /** Close the dialog and drop whatever image was staged in it. */
  function closePhoto() {
    setPhotoOpen(false);
    setCropSrc(null);
    setChecking(false);
  }

  /**
   * Validate a file the dialog handed us. A rejected file leaves the dialog on
   * its drop zone with Save still disabled, so nothing invalid reaches the crop
   * stage.
   */
  async function onFile(file: File) {
    if (!PHOTO_MIME.includes(file.type)) {
      toast.error("That image format isn't supported", {
        description: "Use a JPG, PNG, or WebP image.",
      });
      return;
    }
    if (file.size > PHOTO_MAX_BYTES) {
      const mb = (file.size / 1024 / 1024).toFixed(1);
      toast.error("That photo is too large", {
        description: `It is ${mb} MB. Pick an image under 5 MB.`,
      });
      return;
    }

    setChecking(true);
    const { w, h } = await imageSize(file);
    setChecking(false);
    if (!w || !h) {
      toast.error("We couldn't read that image", {
        description: "The file may be damaged. Try another photo.",
      });
      return;
    }
    // Below the recommended resolution we warn but still let them through - a
    // small photo is a quality problem, not a broken one.
    if (Math.min(w, h) < PHOTO_MIN_EDGE) {
      toast.warning("This photo is low resolution", {
        description: `${w} by ${h} pixels. At least ${PHOTO_MIN_EDGE} by ${PHOTO_MIN_EDGE} looks sharper in print.`,
      });
    }

    setCropSrc(URL.createObjectURL(file));
  }

  /** Store the cropped avatar, compressed so it can't blow the storage quota. */
  async function onCropped(dataUrl: string) {
    closePhoto();
    try {
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], "photo.jpg", { type: "image/jpeg" });
      setPersonal({ photo: await downscaleImage(file) });
    } catch {
      setPersonal({ photo: dataUrl });
    }
  }

  const firstErr = touched.firstName ? nameError(personal.firstName, "First name") : "";
  const lastErr = touched.lastName ? nameError(personal.lastName, "Last name") : "";

  return (
    <div>
      <SectionHeading
        title="Personal details"
        description="Fill in your details and the job title you are aiming for to make a clear first impression."
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field
          label="First name"
          required
          autoComplete="given-name"
          value={personal.firstName}
          onChange={(v) => setPersonal({ firstName: sanitizeName(v) })}
          onBlur={() => setTouched((t) => ({ ...t, firstName: true }))}
          error={firstErr}
          placeholder="e.g., John"
        />
        <Field
          label="Last name"
          required
          autoComplete="family-name"
          value={personal.lastName}
          onChange={(v) => setPersonal({ lastName: sanitizeName(v) })}
          onBlur={() => setTouched((t) => ({ ...t, lastName: true }))}
          error={lastErr}
          placeholder="e.g., Mike"
        />
      </div>

      {/* Desired job title sits on its own row, half width. */}
      <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
        <FieldWrap label="Desired job title">
          <AutocompleteInput
            value={personal.jobTitle}
            onChange={(v) => setPersonal({ jobTitle: v })}
            placeholder="e.g., Product Designer"
            options={JOB_TITLES}
            aiKind="jobTitle"
          />
        </FieldWrap>
      </div>

      {/* Additional details */}
      <button
        type="button"
        onClick={() => setShowMore((v) => !v)}
        aria-expanded={showMore}
        className="mt-6 flex w-full items-center gap-3 rounded-xl bg-muted px-5 py-4 text-left font-semibold text-foreground transition-colors hover:bg-muted/70"
      >
        {showMore ? <Minus className="size-5" /> : <Plus className="size-5" />}
        {showMore ? "Hide additional details" : "Show additional details"}
      </button>

      {showMore && (
        <div className="mt-5 space-y-5">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field
              label="Driver license"
              value={personal.driverLicense}
              onChange={(v) => setPersonal({ driverLicense: v })}
              placeholder="Class C"
            />
            <FieldWrap label="Birth date">
              <BirthDatePicker
                value={personal.birthDate}
                onChange={(v) => setPersonal({ birthDate: v })}
                placeholder="03 Feb 1996"
              />
            </FieldWrap>
          </div>

          {/* Photo - optional, and suppressed for US / UK / Ireland applications. */}
          {photoHidden ? (
            <p className="flex items-start gap-2.5 rounded-xl bg-muted px-5 py-4 text-sm text-muted-foreground">
              <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
              {PHOTO_HIDDEN_REASON}
            </p>
          ) : (
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={openPhoto}
                tabIndex={-1}
                aria-hidden
                className="grid size-13 shrink-0 place-items-center overflow-hidden rounded-xl bg-muted text-muted-foreground outline-none transition-colors hover:bg-muted/70"
              >
                {personal.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={personal.photo} alt="" className="size-full object-cover" />
                ) : (
                  <Camera className="size-5" />
                )}
              </button>
              <div className="leading-tight">
                <button
                  type="button"
                  onClick={openPhoto}
                  className="flex items-center gap-1.5 rounded font-semibold text-foreground outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/40"
                >
                  {personal.photo && <SlidersHorizontal className="size-4" />}
                  {personal.photo ? "Configure" : "Add photo"}
                </button>
                {personal.photo ? (
                  <button
                    type="button"
                    onClick={() => setPersonal({ photo: undefined })}
                    className="mt-3 flex items-center gap-1.5 rounded text-sm font-medium text-destructive outline-none transition-colors hover:underline focus-visible:ring-3 focus-visible:ring-destructive/40"
                  >
                    <Trash2 className="size-4" />
                    Delete
                  </button>
                ) : (
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    JPG, PNG, or WebP. Up to 5 MB.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <ConfigurePhotoDialog
        open={photoOpen}
        src={cropSrc}
        accept={PHOTO_ACCEPT}
        busy={checking}
        onFile={onFile}
        onCancel={closePhoto}
        onSave={onCropped}
      />
    </div>
  );
}
