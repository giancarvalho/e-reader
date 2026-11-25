import styles from "./Avatar.module.css";

export function Avatar({ name, src }: { name: string; src?: string | null }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map(word => Array.from(word)[0] ?? "").join("").toUpperCase();
  const url = src ? URL.parse(src) : null;
  const photo = url?.protocol === "https:" && url.hostname === "lh3.googleusercontent.com" ? url.href : undefined;
  return (
    <span className={styles.avatar} aria-hidden="true">
      {photo
        // Google profile images are optional and limited to its trusted avatar host.
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={photo} alt="" referrerPolicy="no-referrer" loading="lazy" />
        : initials}
    </span>
  );
}
