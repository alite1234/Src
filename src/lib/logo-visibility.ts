import { getSceneVisibilityKey } from "@/lib/constants";
import type {
  LogoVisibility,
  SceneLogoOverride,
  SceneType,
  VisibilityKey,
} from "@/lib/types";

export function logosVisibleFor(
  eventVisibility: LogoVisibility | null | undefined,
  sceneOverride: SceneLogoOverride | null | undefined,
  type: SceneType,
): boolean {
  if (sceneOverride?.mode === "show") return true;
  if (sceneOverride?.mode === "hide") return false;
  const key = getSceneVisibilityKey(type);
  return visibleForKey(eventVisibility, key);
}

export function visibleForKey(
  eventVisibility: LogoVisibility | null | undefined,
  key: VisibilityKey,
): boolean {
  if (!eventVisibility) return true;
  const explicit = eventVisibility.scenes?.[key];
  if (typeof explicit === "boolean") return explicit;
  return eventVisibility.default !== false;
}

export function logoModeLabel(mode: SceneLogoOverride | null | undefined) {
  if (!mode) return "Inherit event settings";
  if (mode.mode === "show") return "Always show logos";
  return "Always hide logos";
}
