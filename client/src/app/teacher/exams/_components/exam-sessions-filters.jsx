import { Search, SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  formatClassLabel,
  RESULT_VISIBILITY_OPTIONS,
  SORT_OPTIONS,
  STATUS_OPTIONS,
} from "./exam-session-options";

const EMPTY_SELECT_VALUE = "__all__";

function toSelectValue(value) {
  return value || EMPTY_SELECT_VALUE;
}

function fromSelectValue(value) {
  return value === EMPTY_SELECT_VALUE ? "" : value;
}

function SelectField({ id, label, value, onValueChange, options }) {
  return (
    <label htmlFor={id} className="flex flex-col gap-2 text-sm font-bold text-foreground">
      <span>{label}</span>
      <Select value={toSelectValue(value)} onValueChange={(next) => onValueChange(fromSelectValue(next))}>
        <SelectTrigger id={id} className="h-11 w-full rounded-full bg-input/70">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {options.map((option) => (
              <SelectItem key={option.value || EMPTY_SELECT_VALUE} value={toSelectValue(option.value)}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </label>
  );
}

export function ExamSessionsFilters({
  classOptions,
  filters,
  onApply,
  onReset,
  onUpdateFilter,
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-12 xl:items-end">
        <label
          htmlFor="exam-search"
          className="flex flex-col gap-2 text-sm font-bold text-foreground xl:col-span-4"
        >
          <span>Search Exam Sessions</span>
          <Input
            id="exam-search"
            value={filters.search}
            onChange={(event) => onUpdateFilter("search", event.target.value)}
            placeholder="Exam title, class, status"
            className="h-11 rounded-full bg-input/70"
          />
        </label>

        <div className="xl:col-span-3">
          <SelectField
            id="status-filter"
            label="Status Filter"
            value={filters.status}
            onValueChange={(value) => onUpdateFilter("status", value)}
            options={STATUS_OPTIONS}
          />
        </div>

        <div className="xl:col-span-3">
          <SelectField
            id="class-filter"
            label="Class Filter"
            value={filters.classId}
            onValueChange={(value) => onUpdateFilter("classId", value)}
            options={[
              { value: "", label: "All classes" },
              ...classOptions.map((classItem) => ({
                value: String(classItem.class_id),
                label: formatClassLabel(classItem),
              })),
            ]}
          />
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={onApply}
          className="h-11 w-full rounded-full px-5 text-sm font-bold xl:col-span-2"
        >
          <Search data-icon="inline-start" aria-hidden="true" />
          Apply
        </Button>

        <div className="xl:col-span-3">
          <SelectField
            id="visibility-filter"
            label="Result Visibility"
            value={filters.resultVisibility}
            onValueChange={(value) => onUpdateFilter("resultVisibility", value)}
            options={RESULT_VISIBILITY_OPTIONS}
          />
        </div>

        <div className="xl:col-span-3">
          <SelectField
            id="sort-filter"
            label="Sort By"
            value={filters.sortBy}
            onValueChange={(value) => onUpdateFilter("sortBy", value)}
            options={SORT_OPTIONS}
          />
        </div>

        <div className="flex items-end md:justify-end xl:col-span-6">
          <Button
            type="button"
            variant="ghost"
            onClick={onReset}
            className="h-11 w-full rounded-full px-4 text-sm font-bold md:w-auto"
          >
            <SlidersHorizontal data-icon="inline-start" aria-hidden="true" />
            Reset Filters
          </Button>
        </div>
      </div>
    </section>
  );
}
