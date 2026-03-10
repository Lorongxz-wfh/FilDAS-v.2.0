import api from "./api";

export interface SearchResultItem {
  type: "document" | "user" | "office" | "page";
  id: number | string;
  title: string;
  description?: string;
  meta?: string;
  url: string;
}

export interface SearchResults {
  documents: SearchResultItem[];
  users: SearchResultItem[];
  offices: SearchResultItem[];
}

export async function globalSearch(q: string): Promise<SearchResults> {
  const { data } = await api.get("/search", { params: { q } });
  return data;
}
