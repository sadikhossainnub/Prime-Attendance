import React from "react";

interface DevicePunchTypeSelectorProps {
  value: "BOTH" | "IN_ONLY" | "OUT_ONLY";
  onChange: (type: "BOTH" | "IN_ONLY" | "OUT_ONLY") => void;
  disabled?: boolean;
}

export const DevicePunchTypeSelector: React.FC<
  DevicePunchTypeSelectorProps
> = ({ value, onChange, disabled = false }) => {
  const options = [
    { value: "BOTH", label: "Both IN & OUT", description: "Accepts all punches" },
    {
      value: "IN_ONLY",
      label: "IN Only",
      description: "Accepts only entrance punches",
    },
    {
      value: "OUT_ONLY",
      label: "OUT Only",
      description: "Accepts only exit punches",
    },
  ];

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
                {option.label}
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
  type: "BOTH" | "IN_ONLY" | "OUT_ONLY";
}

export const DevicePunchTypeBadge: React.FC<DevicePunchTypeBadgeProps> = ({
  type,
}) => {
  const badgeStyles: Record<string, { bg: string; text: string; label: string }> = {
    BOTH: {
      bg: "bg-blue-100",
      text: "text-blue-800",
      label: "Both IN/OUT",
    },
    IN_ONLY: {
      bg: "bg-green-100",
      text: "text-green-800",
      label: "🔓 IN Only",
    },
    OUT_ONLY: {
      bg: "bg-red-100",
      text: "text-red-800",
      label: "🚪 OUT Only",
    },
  };

  const style = badgeStyles[type];

  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${style.bg} ${style.text}`}>
      {style.label}
    </span>
  );
};
