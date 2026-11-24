import { cronJobs } from "convex/server";

import { internal } from "./_generated/api";

const crons = cronJobs();

crons.weekly(
  "refresh feature lines",
  { dayOfWeek: "sunday", hourUTC: 6, minuteUTC: 0 },
  internal.jobs.refreshIndex,
  {},
);

crons.daily(
  "flag shipped requests",
  { hourUTC: 7, minuteUTC: 0 },
  internal.jobs.flagShipped,
  {},
);

// 08:00 UTC is 03:00 in America/New_York during standard time.
crons.daily(
  "sync changelog",
  { hourUTC: 8, minuteUTC: 0 },
  internal.jobs.syncChangelog,
  {},
);

crons.weekly(
  "weekly digest",
  { dayOfWeek: "monday", hourUTC: 7, minuteUTC: 0 },
  internal.jobs.writeDigest,
  {},
);

export default crons;
