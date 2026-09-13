import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildIndex, buildTree, computeQuantities, deriveElements, elementsForRevision, type BimIndex, type BimQuantities } from "../lib/bimModel";
import {
  activeVersion,
  createRevision,
  deleteModel,
  getActiveModel,
  getElements,
  getModels,
  persistModel,
  uploadModel,
  type UploadResult,
} from "../services/bim.service";
import type { SpatialDataset } from "../../visualization/types/visualization.types";
import type { BimElement, BimModel, BimModelVersion, BimTreeNode } from "../types/bim.types";

/** Revisions kept per model — older ones are dropped from the record. */
const MAX_VERSIONS = 12;

export type BimModelsStatus = "idle" | "loading" | "ready" | "error";

export interface UploadProgress {
  running: boolean;
  fileName: string;
  stage: BimModel["status"];
  note: string | null;
}

const IDLE_UPLOAD: UploadProgress = { running: false, fileName: "", stage: "uploading", note: null };

export interface BimModelsApi {
  status: BimModelsStatus;
  error: string | null;
  retry: () => void;
  models: BimModel[];
  activeModel: BimModel | null;
  setActiveModelId: (id: string | null) => void;
  /** Revision being viewed (defaults to the model's active/latest revision). */
  revision: number;
  setRevision: (version: number) => void;
  versions: BimModelVersion[];
  currentVersion: BimModelVersion | null;
  /** Elements of the viewed revision, derived from the live dataset. */
  elements: BimElement[];
  index: BimIndex | null;
  tree: BimTreeNode[];
  quantities: BimQuantities | null;
  upload: (file: File) => Promise<UploadResult | null>;
  uploadProgress: UploadProgress;
  dismissUpload: () => void;
  /** Re-derives the model from the current project geometry and records a revision. */
  syncWithGeometry: () => boolean;
  removeModel: (id: string) => void;
  canRemove: (model: BimModel) => boolean;
}

/**
 * Models of a project: the derived demo model (seeded on first visit) plus any
 * locally registered upload, the active model's elements, index, tree and
 * quantities. Elements are always derived from the dataset the visualization
 * state already loaded — there is no second geometry fetch and no second copy.
 */
export function useBimModels(
  projectId: string | null,
  dataset: SpatialDataset | null,
  preferredModelId: string | null,
  onActiveModel: (model: BimModel | null) => void
): BimModelsApi {
  const [models, setModels] = useState<BimModel[]>([]);
  const [status, setStatus] = useState<BimModelsStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [revision, setRevision] = useState(0);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>(IDLE_UPLOAD);
  const onActiveRef = useRef(onActiveModel);
  onActiveRef.current = onActiveModel;

  useEffect(() => {
    if (!projectId) {
      setModels([]);
      setStatus("idle");
      return;
    }
    let active = true;
    setStatus("loading");
    setError(null);
    getModels(projectId, dataset)
      .then((res) => {
        if (!active) return;
        setModels(res.models);
        setStatus("ready");
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load BIM models.");
        setStatus("error");
      });
    return () => {
      active = false;
    };
    // `dataset` matters: the demo model is seeded as soon as geometry arrives.
  }, [projectId, dataset, attempt]);

  // A project switch always returns to the latest revision.
  useEffect(() => setRevision(0), [projectId, preferredModelId]);

  const activeModel = useMemo(() => getActiveModel(models, preferredModelId), [models, preferredModelId]);

  // Persist which model is active (so a reload returns to it) without looping.
  useEffect(() => {
    if (activeModel && activeModel.id !== preferredModelId) onActiveRef.current(activeModel);
  }, [activeModel, preferredModelId]);

  const fullElements = useMemo(() => getElements(activeModel, dataset), [activeModel, dataset]);
  const elements = useMemo(
    () => (revision > 0 && revision < 3 ? elementsForRevision(fullElements, revision) : fullElements),
    [fullElements, revision]
  );
  const index = useMemo(() => (elements.length > 0 ? buildIndex(elements) : null), [elements]);
  const tree = useMemo(() => (index ? buildTree(index) : []), [index]);
  const quantities = useMemo(() => (index ? computeQuantities(index) : null), [index]);

  const versions = activeModel?.versions ?? [];
  const currentVersion = useMemo(() => {
    if (!activeModel) return null;
    if (revision > 0) return activeModel.versions.find((v) => v.version === revision) ?? null;
    return activeVersion(activeModel);
  }, [activeModel, revision]);

  const setActiveModelId = useCallback(
    (id: string | null) => {
      const next = models.find((m) => m.id === id) ?? null;
      setRevision(0);
      onActiveRef.current(next);
    },
    [models]
  );

  const upload = useCallback(
    async (file: File): Promise<UploadResult | null> => {
      if (!projectId) return null;
      setUploadProgress({ running: true, fileName: file.name, stage: "uploading", note: null });
      const result = await uploadModel(
        projectId,
        { fileName: file.name, sizeBytes: file.size, lastModified: file.lastModified },
        (stage) => setUploadProgress({ running: true, fileName: file.name, stage: stage.status, note: stage.statusNote ?? null })
      );
      // Only the final record is written — the stages are progress, not history.
      setModels(persistModel(projectId, result.model));
      setUploadProgress({ running: false, fileName: file.name, stage: result.model.status, note: result.note });
      return result;
    },
    [projectId]
  );

  const dismissUpload = useCallback(() => setUploadProgress(IDLE_UPLOAD), []);

  const syncWithGeometry = useCallback((): boolean => {
    if (!projectId || !activeModel || !dataset) return false;
    const derived = deriveElements(dataset, activeModel);
    const revised = createRevision(activeModel, derived.length, [
      "Re-derived from the current project geometry",
      `${derived.length} elements · ${formatRevisionNote(derived.length, activeModel)}`,
    ]);
    const trimmed: BimModel = {
      ...revised,
      versions: revised.versions.slice(-MAX_VERSIONS),
    };
    setModels(persistModel(projectId, trimmed));
    setRevision(0);
    return true;
  }, [projectId, activeModel, dataset]);

  const canRemove = useCallback((model: BimModel) => model.source !== "demo", []);

  const removeModel = useCallback(
    (id: string) => {
      if (!projectId) return;
      setModels(deleteModel(projectId, id));
      setRevision(0);
    },
    [projectId]
  );

  const retry = useCallback(() => setAttempt((a) => a + 1), []);

  return {
    status,
    error,
    retry,
    models,
    activeModel,
    setActiveModelId,
    revision,
    setRevision,
    versions,
    currentVersion,
    elements,
    index,
    tree,
    quantities,
    upload,
    uploadProgress,
    dismissUpload,
    syncWithGeometry,
    removeModel,
    canRemove,
  };
}

function formatRevisionNote(elementCount: number, model: BimModel): string {
  const previous = model.versions[model.versions.length - 1]?.elementCount ?? elementCount;
  const delta = elementCount - previous;
  if (delta === 0) return "no change in element count";
  return `${delta > 0 ? "+" : ""}${delta} elements`;
}
