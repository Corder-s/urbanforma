import { SlidersHorizontal, Users } from "lucide-react";
import { Input } from "../../../../components/ui/Input";
import { FormSelect } from "../../../../components/ui/FormSelect";
import { DENSITIES, PLANNING_PRIORITIES, SUSTAINABILITY_GOALS } from "../../project.service";
import type { DevelopmentDensity, PlanningPriority, SustainabilityGoal } from "../../project.types";
import type { CreateProjectForm } from "../../useCreateProjectForm";
import { FormSection } from "./FormSection";

const DENSITY_HINT: Record<DevelopmentDensity, string> = {
  Low: "Predominantly low-rise, generous open space.",
  Medium: "Mid-rise mix with active streets.",
  High: "Compact, high-rise, transit-oriented.",
};

/** Step 3 — population target, density, priority and sustainability goal. */
export function PlanningPreferencesForm({ form }: { form: CreateProjectForm }) {
  const { values, errors, setField, touch } = form;
  return (
    <FormSection
      id="planning-preferences"
      step={3}
      icon={SlidersHorizontal}
      title="Planning Preferences"
      description="Set the targets that will guide design and analysis."
    >
      <div className="grid gap-5 md:grid-cols-2">
        <Input
          id="targetPopulation"
          name="targetPopulation"
          label="Target Population"
          placeholder="e.g. 12,000"
          inputMode="numeric"
          icon={<Users size={17} />}
          value={values.targetPopulation}
          onChange={(e) => setField("targetPopulation", e.target.value)}
          onBlur={() => touch("targetPopulation")}
          error={errors.targetPopulation}
          hint={errors.targetPopulation ? undefined : "Optional · residents and workers"}
        />
        <FormSelect
          id="density"
          name="density"
          label="Development Density"
          value={values.density}
          onChange={(v) => setField("density", v as DevelopmentDensity)}
          options={DENSITIES.map((d) => ({ value: d, label: d }))}
          hint={DENSITY_HINT[values.density]}
        />
        <FormSelect
          id="planningPriority"
          name="planningPriority"
          label="Primary Planning Priority"
          value={values.planningPriority}
          onChange={(v) => setField("planningPriority", v as PlanningPriority)}
          options={PLANNING_PRIORITIES.map((p) => ({ value: p, label: p }))}
        />
        <FormSelect
          id="sustainabilityGoal"
          name="sustainabilityGoal"
          label="Sustainability Goal"
          value={values.sustainabilityGoal}
          onChange={(v) => setField("sustainabilityGoal", v as SustainabilityGoal)}
          options={SUSTAINABILITY_GOALS.map((g) => ({ value: g, label: g }))}
        />
      </div>
    </FormSection>
  );
}
