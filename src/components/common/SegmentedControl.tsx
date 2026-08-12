interface Segment<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  value: T;
  segments: Segment<T>[];
  onChange(value: T): void;
  label: string;
}

export function SegmentedControl<T extends string>({
  value,
  segments,
  onChange,
  label,
}: SegmentedControlProps<T>) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {segments.map((segment) => (
        <button
          key={segment.value}
          type="button"
          className="segmented__item"
          aria-pressed={segment.value === value}
          onClick={() => onChange(segment.value)}
        >
          {segment.label}
        </button>
      ))}
    </div>
  );
}
