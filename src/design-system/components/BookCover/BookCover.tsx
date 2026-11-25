import styles from "./BookCover.module.css";

export function BookCover({ src, title }: { src?: string; title: string }) {
  return (
    <div className={styles.cover} aria-hidden="true">
      {src
        // The image can be a local IndexedDB blob or a short-lived signed URL.
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" />
        : <span>{title}</span>}
    </div>
  );
}
