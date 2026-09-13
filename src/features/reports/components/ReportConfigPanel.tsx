import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, ListChecks, RotateCcw } from "lucide-react";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { Checkbox } from "../../../components/ui/Checkbox";
import { FormSelect } from "../../../components/ui/FormSelect";
import { IconButton } from "../../../components/ui/IconButton";
import { Input } from "../../../components/ui/Input";
import { Textarea } from "../../../components/ui/Textarea";
import { REPORT_TYPES, REPORT_TYPE_META, SECTION_CATALOG } from "../data/report.catalog";
import type { ReportConfig, ReportModel, ReportSectionId, ReportType } from "../types/report.types";

/**
 * Report configuration: type, title, description and the section set.
 *
 * Every change is applied to the stored report immediately, so the preview on
 * the right is always the document that will print — there is no separate
 * "apply" step to forget. Reordering uses move buttons rather than drag and
 * drop: they work with a keyboard, with a screen reader and on a touch screen.
 */

interface ReportConfigPanelProps {
  report: ReportConfig;
  missing: ReportModel["missing"];
  onChangeType: (type: ReportType) => void;
  onChangeTitle: (title: string) => void;
  onChangeDescription: (description: string) => void;
  onToggleSection: (sectionId: ReportSectionId) => void;
  onMoveSection: (sectionId: ReportSectionId, direction: -1 | 1) => void;
  onSetAllSections: (enabled: boolean) => void;
  onResetSections: () => void;
}

export function ReportConfigPanel({
  report,
  missing,
  onChangeType,
  onChangeTitle,
  onChangeDescription,
  onToggleSection,
  onMoveSection,
  onSetAllSections,
  onResetSections,
}: ReportConfigPanelProps) {
  const sections = [...report.sections].sort((a, b) => a.order - b.order);
  const enabledCount = sections.filter((s) => s.enabled).length;
  const typeMeta = REPORT_TYPE_META[report.type];

  // Title and description are edited locally so the field can be transiently
  // empty while retyping; the stored report only ever receives a usable value
  // (see useReports.rename). Props win again when the field is not focused, so a
  // rename made from the report list is reflected here.
  const [title, setTitle] = useState(report.title);
  const [description, setDescription] = useState(report.description);
  const focused = useRef<"title" | "description" | null>(null);
  useEffect(() => {
    if (focused.current !== "title") setTitle(report.title);
    if (focused.current !== "description") setDescription(report.description);
  }, [report.title, report.description]);

  return (
    <section aria-labelledby="report-config-heading" className="rounded-3xl border border-line bg-surface p-4 shadow-soft sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 id="report-config-heading" className="text-[15px] font-extrabold tracking-tight text-ink">
          Report configuration
        </h2>
        <Badge tone={enabledCount > 0 ? "blue" : "amber"}>
          {enabledCount}/{sections.length} sections
        </Badge>
      </div>

      <div className="mt-4 space-y-4">
        <FormSelect
          id="report-type"
          label="Report type"
          value={report.type}
          hint={typeMeta.description}
          onChange={(v) => onChangeType(v as ReportType)}
          options={REPORT_TYPES.map((t) => ({ value: t.id, label: t.label }))}
        />

        <Input
          id="report-title"
          label="Title"
          value={title}
          maxLength={90}
          onFocus={() => {
            focused.current = "title";
          }}
          onBlur={() => {
            focused.current = null;
            onChangeTitle(title);
          }}
          onChange={(e) => {
            setTitle(e.target.value);
            onChangeTitle(e.target.value);
          }}
          hint="Printed on the cover and in the document footer."
        />

        <Textarea
          id="report-description"
          label="Description"
          rows={3}
          value={description}
          maxLength={280}
          placeholder="What is this report for, and who reads it?"
          onFocus={() => {
            focused.current = "description";
          }}
          onBlur={() => {
            focused.current = null;
            onChangeDescription(description);
          }}
          onChange={(e) => {
            setDescription(e.target.value);
            onChangeDescription(e.target.value);
          }}
        />

        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-[13px] font-extrabold tracking-tight text-ink">
              <ListChecks size={16} className="text-primary" aria-hidden="true" />
              Sections
            </h3>
            <span className="flex items-center gap-1">
              <Button size="sm" variant="ghost" onClick={() => onSetAllSections(true)}>
                All
              </Button>
              <Button size="sm" variant="ghost" onClick={() => onSetAllSections(false)}>
                None
              </Button>
              <Button size="sm" variant="ghost" onClick={onResetSections} title={`Use the ${typeMeta.label} defaults`}>
                <RotateCcw size={14} /> Defaults
              </Button>
            </span>
          </div>

          <p className="mt-1.5 text-[12px] leading-relaxed text-muted">
            Enable the sections this document needs and order them with the arrows. The preview updates as you go.
          </p>

          <ul className="mt-3 max-h-[420px] space-y-1.5 overflow-y-auto pr-1" aria-label="Report sections">
            {sections.map((section, index) => {
              const meta = SECTION_CATALOG.find((c) => c.id === section.id);
              if (!meta) return null;
              const noData = meta.needs.length > 0 && meta.needs.every((n) => missing.includes(n));
              return (
                <li
                  key={section.id}
                  className={[
                    "flex items-start gap-2 rounded-xl border px-2.5 py-2 transition-colors",
                    section.enabled ? "border-line bg-surface" : "border-dashed border-line bg-surface-2/40",
                  ].join(" ")}
                >
                  <span className="mt-0.5 w-5 shrink-0 text-center text-[11px] font-bold tabular-nums text-faint">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <Checkbox
                      id={`section-${section.id}`}
                      checked={section.enabled}
                      onChange={() => onToggleSection(section.id)}
                      label={meta.label}
                    />
                    <span className="mt-0.5 block pl-[30px] text-[11.5px] leading-snug text-muted">
                      {meta.blurb}
                      {noData && (
                        <span className="ml-1.5 font-bold text-warning">
                          · no {meta.needs.join("/")} data for this project
                        </span>
                      )}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col">
                    <IconButton
                      icon={ChevronUp}
                      label={`Move ${meta.label} up`}
                      size="xs"
                      disabled={index === 0}
                      onClick={() => onMoveSection(section.id, -1)}
                    />
                    <IconButton
                      icon={ChevronDown}
                      label={`Move ${meta.label} down`}
                      size="xs"
                      disabled={index === sections.length - 1}
                      onClick={() => onMoveSection(section.id, 1)}
                    />
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
