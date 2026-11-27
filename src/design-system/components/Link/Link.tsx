import NextLink from "next/link";
import type { ComponentProps } from "react";
import styles from "./Link.module.css";

type LinkProps = Omit<ComponentProps<"a">, "className" | "href"> & {
  href: string;
  /** `standalone` is a tappable block on its own line; `inline` sits inside running text. */
  variant?: "standalone" | "inline" | "row";
  tone?: "accent" | "muted";
  /** Navigate on the client. By default a link is a document navigation, which also works offline. */
  client?: boolean;
};

export function Link({ variant = "standalone", tone = "accent", client = false, ...props }: LinkProps) {
  const shared = { className: styles.link, "data-variant": variant, "data-tone": tone };
  return client ? <NextLink {...props} {...shared} /> : <a {...props} {...shared} />;
}
