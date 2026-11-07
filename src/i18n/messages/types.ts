export type Plural = { zero?: string; one?: string; two?: string; few?: string; many?: string; other: string };
export interface Dict {
  [key: string]: string | Plural | Dict;
}
