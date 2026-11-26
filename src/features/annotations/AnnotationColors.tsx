import { Button } from "@/design-system/components/Button";
import type { AnnotationColor } from "@/lib/sync/annotations";
import { messages } from "@/lib/messages/pt-br";
import styles from "./annotations.module.css";

const colors: AnnotationColor[] = ["amber", "green", "blue", "pink"];

export function AnnotationColors({ color, disabled, onSelect }: {
  color?: AnnotationColor;
  disabled?: boolean;
  onSelect: (color: AnnotationColor) => void;
}) {
  const { annotations } = messages;
  return (
    <div className={styles.colors} role="group" aria-label={annotations.color}>
      {colors.map(value => (
        <Button key={value} variant="icon" aria-label={annotations.colors[value]} aria-pressed={color === value}
          disabled={disabled} onClick={() => onSelect(value)}>
          <span className={styles.swatch} data-color={value} aria-hidden="true" />
        </Button>
      ))}
    </div>
  );
}
