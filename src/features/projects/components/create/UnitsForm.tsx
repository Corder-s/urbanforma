import { Ruler } from "lucide-react";
import { FormSelect } from "../../../../components/ui/FormSelect";
import { AREA_UNITS, DISTANCE_UNITS } from "../../project.service";
import type { AreaUnit, DistanceUnit } from "../../project.types";
import type { CreateProjectForm } from "../../useCreateProjectForm";
import { FormSection } from "./FormSection";

/** Step 4 — area and distance units used across the project. */
export function UnitsForm({ form }: { form: CreateProjectForm }) {
  const { values, setField } = form;
  return (
    <FormSection
      id="units"
      step={4}
      icon={Ruler}
      title="Units & Standards"
      description="Units follow the workspace's metric preference; adjust them for this project if needed."
    >
      <div className="grid gap-5 md:grid-cols-2">
        <FormSelect
          id="areaUnit"
          name="areaUnit"
          label="Area Unit"
          value={values.areaUnit}
          onChange={(v) => setField("areaUnit", v as AreaUnit)}
          options={AREA_UNITS.map((u) => ({ value: u.value, label: `${u.label} (${u.short})` }))}
          hint="Applies to the Site Area field above and to project metrics."
        />
        <FormSelect
          id="distanceUnit"
          name="distanceUnit"
          label="Distance Unit"
          value={values.distanceUnit}
          onChange={(v) => setField("distanceUnit", v as DistanceUnit)}
          options={DISTANCE_UNITS.map((u) => ({ value: u.value, label: u.label }))}
          hint="Used for road lengths and accessibility distances."
        />
      </div>
    </FormSection>
  );
}
