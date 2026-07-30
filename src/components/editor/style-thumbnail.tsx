"use client";

import { useMemo } from "react";
import { ScaledResumePreview } from "./scaled-resume-preview";
import {
  useResumeStore,
  designForTemplate,
  type ResumeState,
} from "@/lib/store/resume-store";

/**
 * A live mini-preview of ONE template style, rendering the user's CURRENT resume
 * content in that template's design (layout, columns, colors, fonts, heading
 * skin). This is what the right-hand preview becomes if the style is selected -
 * so the carousel thumbnail matches the actual result, instead of a generic
 * stock image that doesn't reflect the template's real design.
 *
 * Fills its (relatively-positioned) parent; the parent owns the aspect box.
 */
export function StyleThumbnail({ templateId }: { templateId: string }) {
  const store = useResumeStore();

  const state = useMemo<ResumeState>(() => {
    // For the ACTIVE style, mirror the live design exactly (including any manual
    // color/column/font tweaks the user made after selecting it). For the others,
    // show what picking them would produce.
    const design =
      store.templateId === templateId
        ? store.design
        : designForTemplate(store.design, templateId);
    return { ...store, templateId, design };
  }, [store, templateId]);

  return <ScaledResumePreview state={state} />;
}
