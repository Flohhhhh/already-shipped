/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as auth from "../auth.js";
import type * as crons from "../crons.js";
import type * as jobs from "../jobs.js";
import type * as jobs_data from "../jobs/data.js";
import type * as jobs_github from "../jobs/github.js";
import type * as jobs_ingest from "../jobs/ingest.js";
import type * as jobs_openrouter from "../jobs/openrouter.js";
import type * as jobs_releases from "../jobs/releases.js";
import type * as jobs_service from "../jobs/service.js";
import type * as jobs_x from "../jobs/x.js";
import type * as posts from "../posts.js";
import type * as posts_data from "../posts/data.js";
import type * as posts_service from "../posts/service.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  auth: typeof auth;
  crons: typeof crons;
  jobs: typeof jobs;
  "jobs/data": typeof jobs_data;
  "jobs/github": typeof jobs_github;
  "jobs/ingest": typeof jobs_ingest;
  "jobs/openrouter": typeof jobs_openrouter;
  "jobs/releases": typeof jobs_releases;
  "jobs/service": typeof jobs_service;
  "jobs/x": typeof jobs_x;
  posts: typeof posts;
  "posts/data": typeof posts_data;
  "posts/service": typeof posts_service;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  auth: import("@convex-dev/auth/_generated/component.js").ComponentApi<"auth">;
  authGithub: import("@convex-dev/auth/components/github/_generated/component.js").ComponentApi<"authGithub">;
  authDiscord: import("@convex-dev/auth/components/discord/_generated/component.js").ComponentApi<"authDiscord">;
};
