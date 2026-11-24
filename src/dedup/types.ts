export type DedupFeature = {
  id: string;
  title: string;
  where: string;
  summary: string;
  percent: number;
  url: string | null;
  label: string | null;
};

export type DedupPost = {
  id: string;
  title: string;
  description: string;
  voteCount: number;
};
