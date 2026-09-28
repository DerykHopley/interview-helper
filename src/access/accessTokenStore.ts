// Where the Candidate's Access Token lives until the Vault arrives (#4): sessionStorage, so it survives a reload
// but not closing the tab. It only gates LLM calls and expires within hours. #4 moves it into encrypted storage.
const KEY = "interview-helper.access-token";

export const accessTokenStore = {
  get(): string | null {
    try {
      return sessionStorage.getItem(KEY);
    } catch {
      return null;
    }
  },
  set(token: string) {
    try {
      sessionStorage.setItem(KEY, token);
    } catch {
      // Storage unavailable (e.g. private mode): the token lasts until the page closes.
    }
  },
  clear() {
    try {
      sessionStorage.removeItem(KEY);
    } catch {
      // Nothing stored.
    }
  },
};
