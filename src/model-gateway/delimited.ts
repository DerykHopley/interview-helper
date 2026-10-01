// Untrusted text in a prompt goes inside its own tags, as data, never as instructions (spec #1, "Security").

/** Changes a tag inside text so it can't close or open that tag. The replacement is one character, so the length
 * doesn't grow. */
export const escapeTag = (text: string, tag: string) => text.replace(new RegExp(`<(\\/?${tag})`, "gi"), "‹$1");

/** Text inside `<tag>…</tag>`, unable to break out of it. */
export const delimited = (tag: string, text: string) => `<${tag}>${escapeTag(text, tag)}</${tag}>`;
