import { notFound } from "next/navigation";
import { Avatar } from "@/design-system/components/Avatar";
import { BookCard } from "@/design-system/components/BookCard";
import { Button } from "@/design-system/components/Button";
import { Heading } from "@/design-system/components/Heading";
import { Text } from "@/design-system/components/Text";
import { TextArea } from "@/design-system/components/TextArea";
import { TextField } from "@/design-system/components/TextField";
import { StatusBanner } from "@/design-system/components/StatusBanner";
import { messages } from "@/lib/messages/pt-br";
import { SheetExample } from "./SheetExample";
import styles from "./page.module.css";

export default function DesignCatalog() {
  if (process.env.NODE_ENV !== "development") notFound();
  const { catalog } = messages;

  return (
    <main className={styles.catalog}>
      <Heading>{catalog.title}</Heading>
      {(["day", "night"] as const).map((theme) => (
        <section className={styles.panel} data-theme={theme} key={theme}>
          <Heading as="h2">{catalog[theme]}</Heading>
          <Text>{catalog.body}</Text>
          <Text variant="reading" tone="muted">{catalog.reading}</Text>
          <TextField label={catalog.invite} autoComplete="off" />
          <TextField label={catalog.invite} error={catalog.inviteError} defaultValue="ABCD" />
          <TextArea label={catalog.note} rows={3} />
          <TextArea label={catalog.noteUnavailable} rows={2} disabled />
          <StatusBanner>{messages.diagnostics.updateAvailable}</StatusBanner>
          <StatusBanner tone="warning">{messages.annotations.syncError}</StatusBanner>
          <Avatar name={catalog.author} />
          <SheetExample />
          <BookCard title={catalog.book} author={catalog.author} status={messages.shelf.available} />
          <div className={styles.actions}>
            <Button>{catalog.primary}</Button>
            <Button variant="secondary">{catalog.secondary}</Button>
            <Button variant="quiet">{catalog.quiet}</Button>
            <Button variant="icon" aria-label={catalog.add}><span aria-hidden="true">+</span></Button>
            <Button disabled>{catalog.disabled}</Button>
            <Button loading>{catalog.loading}</Button>
          </div>
        </section>
      ))}
    </main>
  );
}
