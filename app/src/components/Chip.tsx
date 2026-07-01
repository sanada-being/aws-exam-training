import type { ReactNode } from "react";

/** 絞り込み等で使うトグル型チップ（共通UI）。 */
export function Chip({
  label,
  pressed,
  onClick,
  disabled,
}: {
  label: ReactNode;
  pressed?: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className={`chip${pressed ? " on" : ""}`}
      aria-pressed={pressed}
      onClick={onClick}
      disabled={disabled}
    >
      {label}
    </button>
  );
}
