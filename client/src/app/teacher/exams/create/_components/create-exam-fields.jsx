import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldContent,
  FieldError,
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

export function FieldMessage({ error }) {
  if (!error) return null;
  return <FieldError>{error}</FieldError>;
}

export function TextField({ className, error, label, ...props }) {
  return (
    <Field className={className} data-invalid={Boolean(error)}>
      <FieldLabel htmlFor={props.id || props.name}>{label}</FieldLabel>
      <Input aria-invalid={Boolean(error)} {...props} />
      <FieldMessage error={error} />
    </Field>
  );
}

export function TextAreaField({ className = "lg:col-span-2", error, label, ...props }) {
  return (
    <Field className={className} data-invalid={Boolean(error)}>
      <FieldLabel htmlFor={props.id || props.name}>{label}</FieldLabel>
      <Textarea aria-invalid={Boolean(error)} className="min-h-24 resize-y" {...props} />
      <FieldMessage error={error} />
    </Field>
  );
}

export function SelectField({ children, className, error, label, name, onValueChange, placeholder, value }) {
  return (
    <Field className={className} data-invalid={Boolean(error)}>
      <FieldLabel>{label}</FieldLabel>
      <Select name={name} onValueChange={(nextValue) => onValueChange(name, nextValue)} value={value}>
        <SelectTrigger aria-invalid={Boolean(error)} className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>{children}</SelectGroup>
        </SelectContent>
      </Select>
      <FieldMessage error={error} />
    </Field>
  );
}

export function CheckboxField({ checked, label, onCheckedChange }) {
  return (
    <Field orientation="horizontal" className="min-h-11 rounded-2xl border border-border px-3 py-2">
      <Checkbox checked={checked} onCheckedChange={onCheckedChange} />
      <FieldContent>
        <FieldTitle>{label}</FieldTitle>
      </FieldContent>
    </Field>
  );
}

export { SelectItem };
