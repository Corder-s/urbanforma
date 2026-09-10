import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  EMPTY_CREATE_FORM,
  clearProjectDraft,
  createProject,
  loadProjectDraft,
  saveProjectDraft,
  toCreateProjectInput,
  validateCreateProject,
  type CreateProjectDraft,
} from "./project.service";
import type {
  CreateProjectErrors,
  CreateProjectField,
  CreateProjectFormValues,
  Project,
} from "./project.types";

export type SubmitState = "idle" | "submitting" | "error";
export type DraftNotice = { kind: "saved" | "restored" | "discarded" | "failed"; at: number } | null;

interface Options {
  owner: { name: string; role: string; email: string };
  onCreated: (project: Project) => void;
}

/** Fields that count toward the "Project Setup" completion indicator. */
export const SETUP_FIELDS: CreateProjectField[] = [
  "name",
  "type",
  "location",
  "siteArea",
  "targetPopulation",
  "density",
  "planningPriority",
];

const isSet = (v: CreateProjectFormValues, f: CreateProjectField): boolean => v[f].toString().trim() !== "";

/**
 * All Create Project form logic: controlled values, validation (on blur + on
 * submit), a localStorage draft, and submission through the service layer.
 * Components stay presentational.
 */
export function useCreateProjectForm({ owner, onCreated }: Options) {
  const [values, setValues] = useState<CreateProjectFormValues>(EMPTY_CREATE_FORM);
  const [touched, setTouched] = useState<Partial<Record<CreateProjectField, boolean>>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [pendingDraft, setPendingDraft] = useState<CreateProjectDraft | null>(null);
  const [draftNotice, setDraftNotice] = useState<DraftNotice>(null);
  const [dirty, setDirty] = useState(false);
  const noticeTimer = useRef<number | null>(null);

  // Offer to restore a saved draft on first mount.
  useEffect(() => {
    const draft = loadProjectDraft();
    if (draft) setPendingDraft(draft);
  }, []);

  useEffect(() => () => {
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
  }, []);

  const notify = useCallback((kind: NonNullable<DraftNotice>["kind"]) => {
    setDraftNotice({ kind, at: Date.now() });
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setDraftNotice(null), 3200);
  }, []);

  const allErrors = useMemo(() => validateCreateProject(values), [values]);

  /** Errors to display: only for touched fields, or everything after a submit attempt. */
  const errors: CreateProjectErrors = useMemo(() => {
    if (submitAttempted) return allErrors;
    const shown: CreateProjectErrors = {};
    (Object.keys(allErrors) as CreateProjectField[]).forEach((k) => {
      if (touched[k]) shown[k] = allErrors[k];
    });
    return shown;
  }, [allErrors, touched, submitAttempted]);

  const setField = useCallback(<K extends CreateProjectField>(field: K, value: CreateProjectFormValues[K]) => {
    setValues((v) => ({ ...v, [field]: value }));
    setDirty(true);
    if (submitState === "error") setSubmitState("idle");
  }, [submitState]);

  const touch = useCallback((field: CreateProjectField) => {
    setTouched((t) => (t[field] ? t : { ...t, [field]: true }));
  }, []);

  const completedCount = useMemo(() => SETUP_FIELDS.filter((f) => isSet(values, f)).length, [values]);
  const isValid = Object.keys(allErrors).length === 0;

  // --- drafts ---------------------------------------------------------------
  const saveDraft = useCallback(() => {
    const saved = saveProjectDraft(values);
    notify(saved ? "saved" : "failed");
    if (saved) setDirty(false);
  }, [values, notify]);

  const restoreDraft = useCallback(() => {
    if (!pendingDraft) return;
    setValues(pendingDraft.values);
    setPendingDraft(null);
    setDirty(false);
    notify("restored");
  }, [pendingDraft, notify]);

  const discardDraft = useCallback(() => {
    clearProjectDraft();
    setPendingDraft(null);
    notify("discarded");
  }, [notify]);

  // --- submit ---------------------------------------------------------------
  const submit = useCallback(async (): Promise<CreateProjectField | null> => {
    setSubmitAttempted(true);
    const currentErrors = validateCreateProject(values);
    const firstInvalid = (Object.keys(currentErrors) as CreateProjectField[])[0] ?? null;
    if (firstInvalid) return firstInvalid;
    if (submitState === "submitting") return null; // guard double submit
    setSubmitState("submitting");
    try {
      const project = await createProject(toCreateProjectInput(values), owner);
      clearProjectDraft();
      setDirty(false);
      onCreated(project);
      return null;
    } catch {
      setSubmitState("error");
      return null;
    }
  }, [values, submitState, owner, onCreated]);

  return {
    values,
    errors,
    setField,
    touch,
    submit,
    submitState,
    isValid,
    completedCount,
    totalSetupFields: SETUP_FIELDS.length,
    dirty,
    draft: { pending: pendingDraft, save: saveDraft, restore: restoreDraft, discard: discardDraft, notice: draftNotice },
  };
}

export type CreateProjectForm = ReturnType<typeof useCreateProjectForm>;
