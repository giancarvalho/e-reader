import { Button } from "@/design-system/components/Button";
import { List } from "@/design-system/components/List";
import type { TocEntry } from "@/vendor/foliate/epub";
import styles from "./reader.module.css";

export function TocList({ entries, current, goTo }: { entries: TocEntry[]; current?: string; goTo: (href: string) => void }) {
  return (
    <div className={styles.toc}>
      <List>
        {entries.map((entry, index) => (
          <li key={`${entry.href}-${index}`}>
            <Button variant={entry.href === current ? "secondary" : "quiet"} aria-current={entry.href === current ? "location" : undefined}
              onClick={() => goTo(entry.href)}>{entry.label}</Button>
            {entry.subitems?.length ? <TocList entries={entry.subitems} current={current} goTo={goTo} /> : null}
          </li>
        ))}
      </List>
    </div>
  );
}
