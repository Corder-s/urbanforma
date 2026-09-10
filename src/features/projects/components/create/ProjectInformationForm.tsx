import { FolderPen, MapPin, Search } from "lucide-react";
import { Input } from "../../../../components/ui/Input";
import { Textarea } from "../../../../components/ui/Textarea";
import { FormSelect } from "../../../../components/ui/FormSelect";
import { PROJECT_LOCATIONS, PROJECT_TYPES } from "../../project.service";
import type { CreateProjectForm } from "../../useCreateProjectForm";
import type { ProjectType } from "../../project.types";
import { FormSection } from "./FormSection";

const LOCATION_LIST_ID = "create-project-locations";

/** Step 1 — name, description, type and (demo) location. */
export function ProjectInformationForm({ form }: { form: CreateProjectForm }) {
  const { values, errors, setField, touch } = form;
  return (
    <FormSection
      id="project-information"
      step={1}
      icon={FolderPen}
      title="Project Information"
      description="Give the project a clear name and describe its purpose. Fields marked * are required."
    >
      <Input
        id="name"
        name="name"
        label="Project Name *"
        placeholder="Enter project name"
        value={values.name}
        onChange={(e) => setField("name", e.target.value)}
        onBlur={() => touch("name")}
        error={errors.name}
        maxLength={80}
        autoComplete="off"
        required
      />

      <Textarea
        id="description"
        name="description"
        label="Description"
        placeholder="Describe the project..."
        value={values.description}
        onChange={(e) => setField("description", e.target.value)}
        rows={4}
        maxLength={600}
        hint="Optional — a short summary shown on the project card."
      />

      <div className="grid gap-5 md:grid-cols-2">
        <FormSelect
          id="type"
          name="type"
          label="Project Type *"
          placeholder="Select project type"
          value={values.type}
          onChange={(v) => {
            setField("type", v as ProjectType | "");
            touch("type");
          }}
          onBlur={() => touch("type")}
          options={PROJECT_TYPES.map((t) => ({ value: t, label: t }))}
          error={errors.type}
          required
        />

        <div>
          <Input
            id="location"
            name="location"
            label="Location *"
            placeholder="Search location"
            icon={<Search size={17} />}
            value={values.location}
            onChange={(e) => setField("location", e.target.value)}
            onBlur={() => touch("location")}
            error={errors.location}
            list={LOCATION_LIST_ID}
            autoComplete="off"
            required
            hint={errors.location ? undefined : "City or district. Map search connects in a later step."}
            trailing={<MapPin size={16} className="text-faint" aria-hidden="true" />}
          />
          <datalist id={LOCATION_LIST_ID}>
            {PROJECT_LOCATIONS.map((l) => (
              <option key={l} value={l} />
            ))}
          </datalist>
        </div>
      </div>
    </FormSection>
  );
}
