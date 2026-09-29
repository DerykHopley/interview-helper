// The Access Token in use, held in memory only, so the Model Gateway can send it with each call. Its lasting copy is
// encrypted in the Vault (ADR 0001); this one is filled on unlock and emptied on lock, a reload or closing the tab.
let current: string | null = null;

export const accessTokenStore = {
  get: () => current,
  set(token: string) {
    current = token;
  },
  clear() {
    current = null;
  },
};
