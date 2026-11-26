import { notFound } from "next/navigation";
import { Avatar } from "@/design-system/components/Avatar";
import { BookCard } from "@/design-system/components/BookCard";
import { Button } from "@/design-system/components/Button";
import { Notice } from "@/design-system/components/Notice";
import { ColorField } from "@/design-system/components/ColorField";
import { Section } from "@/design-system/components/Section";
import { Page } from "@/design-system/components/Page";
import { Disclosure } from "@/design-system/components/Disclosure";
import { Heading } from "@/design-system/components/Heading";
import { IconButton } from "@/design-system/components/IconButton";
import { List, ListItem } from "@/design-system/components/List";
import { Link } from "@/design-system/components/Link";
import { LinkButton } from "@/design-system/components/LinkButton";
import { Text } from "@/design-system/components/Text";
import { Swatch } from "@/design-system/components/Swatch";
import { TextArea } from "@/design-system/components/TextArea";
import { TextField } from "@/design-system/components/TextField";
import { Progress } from "@/design-system/components/Progress";
import { StatusBanner } from "@/design-system/components/StatusBanner";
import { messages } from "@/lib/messages/pt-br";
import { PopoverExample } from "./PopoverExample";
import { SheetExample } from "./SheetExample";
import styles from "./page.module.css";

export default function DesignCatalog() {
  if (process.env.NODE_ENV !== "development") notFound();
  const { catalog } = messages;

  return (
    <Page>
      <Heading>{catalog.title}</Heading>
      {(["day", "night"] as const).map((theme) => (
        <section className={styles.panel} data-theme={theme} key={theme}>
          <Heading as="h2">{catalog[theme]}</Heading>
          <Heading as="h2" variant="section">{catalog.section}</Heading>
          <Heading as="h2" variant="display">{catalog.display}</Heading>
          <Text>{catalog.body}</Text>
          <Text variant="label" tone="muted">{catalog.label}</Text>
          <Text variant="reading" tone="muted">{catalog.reading}</Text>
          <TextField label={catalog.invite} autoComplete="off" />
          <TextField label={catalog.invite} error={catalog.inviteError} defaultValue="ABCD" />
          <TextArea label={catalog.note} rows={3} />
          <TextArea label={catalog.noteUnavailable} rows={2} disabled />
          <StatusBanner>{messages.diagnostics.updateAvailable}</StatusBanner>
          <StatusBanner tone="warning">{messages.annotations.syncError}</StatusBanner>
          <Notice>{messages.annotations.saved}</Notice>
          <Notice live="alert">{messages.annotations.saveFailed}</Notice>
          <Avatar name={catalog.author} />
          <SheetExample />
          <PopoverExample />
          <BookCard title={catalog.book} author={catalog.author} status={messages.shelf.available} />
          <BookCard featured title={catalog.book} author={catalog.author} />
          <div className={styles.actions}>
            <Button>{catalog.primary}</Button>
            <Button variant="secondary">{catalog.secondary}</Button>
            <Button variant="quiet">{catalog.quiet}</Button>
            <Button variant="icon" aria-label={catalog.add}><span aria-hidden="true">+</span></Button>
            <Button disabled>{catalog.disabled}</Button>
            <Button loading>{catalog.loading}</Button>
          </div>
          <div className={styles.actions}>
            <IconButton icon="close" label={catalog.close} />
            <IconButton icon="reply" label={catalog.reply} />
            <IconButton icon="trash" label={catalog.remove} />
            <IconButton icon="conversation" label={catalog.conversation} />
            <IconButton icon="more" label={catalog.more} aria-expanded={true} />
            <IconButton icon="send" label={catalog.send} disabled />
          </div>
          <div className={styles.actions}>
            <LinkButton href="#">{catalog.primary}</LinkButton>
            <LinkButton href="#" variant="secondary">{catalog.secondary}</LinkButton>
            <LinkButton href="#" variant="quiet">{catalog.quiet}</LinkButton>
          </div>
          <Progress label={catalog.progress} value={0.4} valueText="40%" />
          <div className={styles.actions}>
            {(["amber", "green", "blue", "pink"] as const).map(tone => <Swatch key={tone} tone={tone} selected={tone === "green"} />)}
          </div>
          <ColorField label={catalog.color} value="#b5532f" onChange={() => undefined} />
          <Section title={catalog.section}><Text>{catalog.body}</Text></Section>
          <Section variant="outlined" title={catalog.section}><Text>{catalog.body}</Text></Section>
          <List>
            <ListItem divided><Text>{catalog.body}</Text></ListItem>
            <ListItem divided><Text>{catalog.body}</Text></ListItem>
          </List>
          <Disclosure summary={catalog.section} open><Text>{catalog.body}</Text></Disclosure>
          <Link href="#">{catalog.link}</Link>
          <Text>{catalog.body} <Link href="#" variant="inline">{catalog.link}</Link></Text>
          <Text tone="muted"><Link href="#" variant="inline" tone="muted">{catalog.link}</Link></Text>
        </section>
      ))}
    </Page>
  );
}
