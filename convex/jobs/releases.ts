import featureIndex from "../../data/feature-index.json";
import { isReleaseNoise, releaseVersion } from "../../src/jobs/parse";
import type { ShippedFeature } from "../../src/jobs/shipped";

type RawEntry = {
  id: string;
  title: string;
  summary: string;
  where: string;
  kind: string;
  sources?: { url?: string }[];
};

export function releaseFeatures(): ShippedFeature[] {
  const entries = (featureIndex as { entries?: RawEntry[] }).entries ?? [];
  const features: ShippedFeature[] = [];
  for (const entry of entries) {
    if (entry.kind !== "release") continue;
    if (isReleaseNoise(entry.title)) continue;
    const version = releaseVersion(entry.where);
    if (!version) continue;
    features.push({
      id: entry.id,
      title: entry.title,
      summary: entry.summary,
      version,
      url: entry.sources?.find((source) => source.url)?.url ?? "",
    });
  }
  return features;
}
