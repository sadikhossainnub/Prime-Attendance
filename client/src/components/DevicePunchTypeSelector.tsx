import React from "react";

interface DevicePunchTypeSelectorProps {
  value: "BOTH" | "IN_ONLY" | "OUT_ONLY";
  onChange: (type: "BOTH" | "IN_ONLY" | "OUT_ONLY") => void;
  disabled?: boolean;
  compact?: boolean;
}

export const DevicePunchTypeSelector: React.FC<
  DevicePunchTypeSelectorProps
> = ({ value, onChange, disabled = false, compact = false }) => {
  const options = [
    { value: "BOTH", label: "Both IN & OUT", description: "Accepts all punches", emoji: "↔️" },
    {
      value: "IN_ONLY",
      label: "IN Only",
      description: "Accepts only entrance punches",
      emoji: "🔓",
    },
    {
      value: "OUT_ONLY",
      label: "OUT Only",
      description: "Accepts only exit punches",
      emoji: "🚪",
    },
  ];

  if (compact) {
    return (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as "BOTH" | "IN_ONLY" | "OUT_ONLY")}
        disabled={disabled}
        className="bg-slate-950 border border-slate-600 rounded px-2 py-1 text-xs text-white disabled:opacity-50 cursor-pointer"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.emoji} {option.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        Punch Type Configuration
      </label>
      <div className="space-y-2">
        {options.map((option) => (
          <div key={option.value} className="flex items-center">
            <input
              type="radio"
              id={`punch_type_${option.value}`}
              name="punch_type"
              value={option.value}
              checked={value === option.value}
              onChange={(e) =>
                onChange(e.target.value as "BOTH" | "IN_ONLY" | "OUT_ONLY")
              }
              disabled={disabled}
              className="h-4 w-4 text-blue-600"
            />
            <label
              htmlFor={`punch_type_${option.value}`}
              className="ml-3 flex flex-col cursor-pointer"
            >
              <span className="text-sm font-medium text-gray-900">
                {option.emoji} {option.label}
              </span>
              <span className="text-xs text-gray-500">{option.description}</span>
            </label>
          </div>
        ))}
      </div>
    </div>
  );
};

interface DevicePunchTypeBadgeProps {
  type: "BOTH" | "IN_ONLY" | "OUT_ONLY" | undefined;
}

export const DevicePunchTypeBadge: React.FC<DevicePunchTypeBadgeProps> = ({
  type,
}) => {
  if (!type) return <span className="text-slate-400 text-xs">Not set</span>;

  const badgeStyles: Record<string, { bg: string; text: string; label: string; icon: string }> = {
    BOTH: {
      bg: "bg-blue-900/50",
      text: "text-blue-300",
      label: "Both IN/OUT",
      icon: "↔️",
    },
    IN_ONLY: {
      bg: "bg-green-900/50",
      text: "text-green-300",
      label: "IN Only",
      icon: "🔓",
    },
    OUT_ONLY: {
      bg: "bg-red-900/50",
      text: "text-red-300",
      label: "OUT Only",
      icon: "🚪",
    },
  };

  const style = badgeStyles[type];

  return (
    <span className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium ${style.bg} ${style.text}`}>
      {style.icon} {style.label}
    </span>
  );
};
