import { Button } from "@/design-system/components/Button";
import { List, ListItem } from "@/design-system/components/List";
import { Text } from "@/design-system/components/Text";
import type { InstallKind } from "@/lib/install";
import { messages } from "@/lib/messages/pt-br";
import styles from "./install.module.css";

/** What to do to install the app on this device: a button where the browser allows it, steps elsewhere. */
export function InstallGuide({ kind, canPrompt, onInstall }: {
  kind: InstallKind;
  canPrompt: boolean;
  onInstall: () => void;
}) {
  const { install } = messages;
  if (kind === "installed") return <Text>{install.installed}</Text>;
  if (kind === "none") return <Text>{install.unavailable}</Text>;
  if (kind === "embedded") return <Text>{install.embedded}</Text>;

  const steps = kind === "ios" ? install.iosSteps : install.androidSteps;
  return (
    <div className={styles.guide}>
      <Text>{install.intro}</Text>
      {kind === "android" && canPrompt
        ? <Button onClick={onInstall}>{install.install}</Button>
        : <List as="ol">{steps.map((step, index) => <ListItem key={step}>{`${index + 1}. ${step}`}</ListItem>)}</List>}
    </div>
  );
}
