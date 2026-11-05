/**
 * The boards and parts the hardware service offers, built into the website so
 * the Hybrid page can still show them when that service can't be reached.
 * Creating and running an experiment still needs the service.
 *
 * catalog.json is jumetra-backend's GET /controllers and GET /components/search
 * (its "source" says which commit). When the backend's catalog changes, copy
 * those two answers in again; __tests__/HybridCatalog.test.ts checks the shape.
 */
import type { ComponentSearchHit, ControllerSpec } from "@/lib/types";
import catalog from "./catalog.json";

export const builtInControllers = catalog.controllers as ControllerSpec[];
export const builtInComponents = catalog.components as unknown as ComponentSearchHit[];
