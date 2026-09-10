import { LandPlot } from "lucide-react";
import { Input } from "../../../../components/ui/Input";
import { AREA_UNITS, hectaresToSquareMeters, parseNumber, toHectares } from "../../project.service";
import type { CreateProjectForm } from "../../useCreateProjectForm";
import { FormSection } from "./FormSection";
import { SiteBoundaryPlaceholder } from "./SiteBoundaryPlaceholder";

function derivedArea(raw: string, unit: CreateProjectForm["values"]["areaUnit"]): string | null {
  const n = parseNumber(raw);
  if (n === null || n <= 0) return null;
  const ha = toHectares(n, unit);
  const m2 = hectaresToSquareMeters(ha);
  if (unit === "ha") return `≈ ${m2.toLocaleString("en-US", { maximumFractionDigits: 0 })} m²`;
  return `≈ ${ha.toLocaleString("en-US", { maximumFractionDigits: 2 })} ha · ${m2.toLocaleString("en-US", { maximumFractionDigits: 0 })} m²`;
}

/** Step 2 — site area (with unit), boundary placeholder and optional coordinates. */
export function SiteDetailsForm({ form }: { form: CreateProjectForm }) {
  const { values, errors, setField, touch } = form;
  const unit = AREA_UNITS.find((u) => u.value === values.areaUnit) ?? AREA_UNITS[0];
  const derived = derivedArea(values.siteArea, values.areaUnit);

  return (
    <FormSection
      id="site-details"
      step={2}
      icon={LandPlot}
      title="Site Details"
      description="Define how large the site is and, optionally, where its centre lies."
    >
      <Input
        id="siteArea"
        name="siteArea"
        label={`Site Area * (${unit.label.toLowerCase()})`}
        placeholder="0.0"
        inputMode="decimal"
        value={values.siteArea}
        onChange={(e) => setField("siteArea", e.target.value)}
        onBlur={() => touch("siteArea")}
        error={errors.siteArea}
        hint={derived ?? `Entered in ${unit.label.toLowerCase()} — change the unit in Units & Standards.`}
        trailing={<span className="text-sm font-bold text-muted">{unit.short}</span>}
        required
      />

      <SiteBoundaryPlaceholder />

      <div className="grid gap-5 md:grid-cols-2">
        <Input
          id="latitude"
          name="latitude"
          label="Latitude"
          placeholder="e.g. 28.4595"
          inputMode="decimal"
          value={values.latitude}
          onChange={(e) => setField("latitude", e.target.value)}
          onBlur={() => touch("latitude")}
          error={errors.latitude}
          hint={errors.latitude ? undefined : "Optional · decimal degrees (−90 to 90)"}
        />
        <Input
          id="longitude"
          name="longitude"
          label="Longitude"
          placeholder="e.g. 77.0266"
          inputMode="decimal"
          value={values.longitude}
          onChange={(e) => setField("longitude", e.target.value)}
          onBlur={() => touch("longitude")}
          error={errors.longitude}
          hint={errors.longitude ? undefined : "Optional · decimal degrees (−180 to 180)"}
        />
      </div>
    </FormSection>
  );
}
