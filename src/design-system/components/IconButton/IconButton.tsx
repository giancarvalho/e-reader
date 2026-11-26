import type { ComponentProps } from "react";
import { Button } from "../Button";
import { Icon, type IconName } from "../Icon";

type IconButtonProps = Omit<ComponentProps<"button">, "children" | "className" | "aria-label"> & {
  icon: IconName;
  /** The accessible name. Required: an icon alone says nothing to a screen reader. */
  label: string;
  loading?: boolean;
};

export function IconButton({ icon, label, ...props }: IconButtonProps) {
  return (
    <Button {...props} variant="icon" aria-label={label}>
      <Icon name={icon} />
    </Button>
  );
}
