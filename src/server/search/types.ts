export type FeatureKind = "setting" | "doc" | "release";

export type FeatureSource = {
  url: string;
  label: string;
};

export type FeatureEntry = {
  id: string;
  title: string;
  summary: string;
  where: string;
  kind: FeatureKind;
  terms: string[];
  sources: FeatureSource[];
};

export type FeatureIndex = {
  generatedAt: string;
  commitSha: string;
  repository: string;
  entries: FeatureEntry[];
};

export type FeatureMatch = {
  entry: FeatureEntry;
  score: number;
  coverage: number;
};

export type SearchResult = {
  query: string;
  best: FeatureMatch | null;
  alternatives: FeatureMatch[];
  matcher: "lexical" | "embeddings";
};

export type Suggestion = {
  id: string;
  title: string;
  where: string;
};
