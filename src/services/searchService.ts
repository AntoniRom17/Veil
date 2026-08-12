import type { VeilDatabase } from "@/src/db/VeilDatabase";

export type SearchResultKind = "product" | "routine" | "journal" | "note" | "observation";

export interface SearchResult {
  id: string;
  kind: SearchResultKind;
  title: string;
  subtitle: string;
  searchText: string;
}

export async function searchVeil(db: VeilDatabase, rawQuery: string, limit = 30): Promise<SearchResult[]> {
  const query = normalize(rawQuery);
  if (!query) return [];
  const [products, routines, journal, notes, observations] = await Promise.all([
    db.products.toArray(),
    db.routines.toArray(),
    db.journalEntries.toArray(),
    db.quickNotes.toArray(),
    db.reactionLogs.toArray(),
  ]);
  const results: SearchResult[] = [
    ...products.map((product) => ({ id: product.id, kind: "product" as const, title: product.name, subtitle: [product.brand, product.categoryName].filter(Boolean).join(" · "), searchText: [product.name, product.brand, product.categoryName, product.ingredients, product.activeIngredients, product.notes].join(" ") })),
    ...routines.map((routine) => ({ id: routine.id, kind: "routine" as const, title: routine.name, subtitle: `${routine.period.toUpperCase()} routine`, searchText: [routine.name, routine.notes].join(" ") })),
    ...journal.map((entry) => ({ id: entry.id, kind: "journal" as const, title: entry.title, subtitle: entry.localDate, searchText: [entry.title, entry.notes, entry.tags.join(" ")].join(" ") })),
    ...notes.map((note) => ({ id: note.id, kind: "note" as const, title: note.text, subtitle: note.localDate, searchText: note.text })),
    ...observations.map((entry) => ({ id: entry.id, kind: "observation" as const, title: entry.observationType, subtitle: entry.localDate, searchText: [entry.observationType, entry.notes].join(" ") })),
  ];
  return results
    .filter((result) => normalize(result.searchText).includes(query))
    .sort((left, right) => score(right, query) - score(left, query) || left.title.localeCompare(right.title))
    .slice(0, limit);
}

function normalize(value: string): string {
  return value.toLocaleLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").trim();
}

function score(result: SearchResult, query: string): number {
  const title = normalize(result.title);
  if (title === query) return 3;
  if (title.startsWith(query)) return 2;
  return 1;
}
