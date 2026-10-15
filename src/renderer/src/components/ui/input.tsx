import { useState } from "react"
import { cn } from "@/lib/utils"
import { LucideIcon, X } from "lucide-react"

interface InputProps {
  type?: string
  defaultValue?: string
  value?: string
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  className?: string
  placeholder?: string
  Icon?: LucideIcon
  disabled?: boolean
  maxLength?: number
}

function Input({
  type = "text",
  defaultValue,
  onChange,
  className,
  placeholder,
  disabled,
  ...props
}: InputProps): React.ReactElement {
  return (
    <input
      type={type}
      defaultValue={defaultValue}
      onChange={onChange}
      className={cn(
        "w-full bg-flow-card border border-flow-border rounded-lg px-3 py-2 text-flow-text",
        "focus:ring-0 focus:outline-hidden focus:border-flow-primary transition-colors",
        "placeholder:text-flow-text-secondary disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      placeholder={placeholder}
      disabled={disabled}
      {...props}
    />
  )
}

interface LargeInputProps {
  placeholder?: string
  value?: string
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  onClear?: () => void
  icon?: LucideIcon
  className?: string
}

function LargeInput({
  placeholder,
  value,
  onChange,
  onClear,
  icon: Icon,
  className,
  ...props
}: LargeInputProps): React.ReactElement {
  const [focused, setFocused] = useState(false)
  const showClear = Boolean(onClear) && typeof value === "string" && value.length > 0

  return (
    <div
      className={cn(
        "flex items-center gap-3 bg-flow-card border rounded-lg px-4 backdrop-blur-xs transition-all duration-200",
        focused
          ? "border-flow-primary shadow-[0_0_0_3px_rgba(22,163,74,0.15)]"
          : "border-flow-border hover:border-flow-border-secondary",
        className,
      )}
    >
      {Icon && (
        <Icon
          className={cn(
            "w-5 h-5 shrink-0 transition-colors",
            focused ? "text-flow-primary" : "text-flow-text-secondary",
          )}
        />
      )}
      <input
        type="text"
        placeholder={placeholder}
        className="w-full py-3 px-0 bg-transparent border-none focus:outline-hidden focus:ring-0 text-flow-text placeholder:text-flow-text-secondary"
        value={value}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        {...props}
      />
      {showClear && (
        <button
          type="button"
          title="Clear search"
          aria-label="Clear search"
          onClick={onClear}
          className="p-1.5 shrink-0 rounded-lg text-flow-text-secondary hover:bg-flow-accent hover:text-flow-text transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}

export { Input, LargeInput }
