import packageJson from "../../package.json";

/** The release number shown to people, bumped in `package.json` by every pull request (see AGENTS.md). */
export const appVersion: string = packageJson.version;
