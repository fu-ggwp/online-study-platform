import { getStatusClassName, getStatusLabel } from "../../../_components/exam-session-options";

import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldContent,
  FieldError as ShadcnFieldError,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export function FieldError({ message }) {
  if (!message) return null;
  return <ShadcnFieldError>{message}</ShadcnFieldError>;
}

export function TextField({ className, label, name, value, onChange, error, disabled, type = "text", min }) {
  return (
    <Field className={className} data-disabled={disabled} data-invalid={Boolean(error)}>
      <FieldLabel htmlFor={name}>{label}</FieldLabel>
      <Input
        id={name}
        name={name}
        type={type}
        min={min}
        value={value}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        onChange={(event) => onChange(name, event.target.value)}
      />
      <FieldError message={error} />
    </Field>
  );
}

export function ReadOnlyField({ className, label, value }) {
  return (
    <Field className={className} data-disabled>
      <FieldLabel>{label}</FieldLabel>
      <div className="flex h-8 items-center rounded-2xl bg-muted px-3 text-sm text-muted-foreground">
        <span className="truncate">{value || "Not set"}</span>
      </div>
    </Field>
  );
}

export function ToggleRow({ label, name, checked, onChange, disabled }) {
  return (
    <Field data-disabled={disabled} orientation="horizontal" className="min-h-11 rounded-2xl border border-border px-3 py-2">
      <Checkbox
        checked={checked}
        disabled={disabled}
        onCheckedChange={(value) => onChange(name, Boolean(value))}
      />
      <FieldContent>
        <FieldTitle>{label}</FieldTitle>
      </FieldContent>
    </Field>
  );
}

export function SelectField({ children, className, disabled, error, label, name, onChange, value }) {
  return (
    <Field className={className} data-disabled={disabled} data-invalid={Boolean(error)}>
      <FieldLabel>{label}</FieldLabel>
      <Select disabled={disabled} name={name} onValueChange={(nextValue) => onChange(name, nextValue)} value={value}>
        <SelectTrigger aria-invalid={Boolean(error)} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>{children}</SelectGroup>
        </SelectContent>
      </Select>
      <FieldError message={error} />
    </Field>
  );
}

export function TextAreaField({ className = "lg:col-span-2", disabled, label, name, onChange, value, ...props }) {
  return (
    <Field className={className} data-disabled={disabled}>
      <FieldLabel htmlFor={name}>{label}</FieldLabel>
      <Textarea
        className="min-h-24 resize-y"
        disabled={disabled}
        id={name}
        name={name}
        onChange={(event) => onChange(name, event.target.value)}
        value={value}
        {...props}
      />
    </Field>
  );
}

export function StatusBadge({ status }) {
  return (
    <Badge className={getStatusClassName(status)} variant="outline">
      {getStatusLabel(status)}
    </Badge>
  );
}

export { SelectItem };
