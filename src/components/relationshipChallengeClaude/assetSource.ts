import type { ImageSourcePropType } from 'react-native';

import { RC_CLAUDE_PLACEHOLDERS } from './placeholderSources';

/**
 * Where the room's pictures come from. Gameplay only ever asks for an asset
 * id; swapping the flat SVG placeholders for final WebP/PNG art means adding
 * entries to `RC_CLAUDE_INSTALLED` and nothing else: canvas sizes, anchors and
 * hit rectangles are already fixed by the scene manifest.
 */
export interface RcAssetSource {
  resolve(assetId: string): ImageSourcePropType | undefined;
  /** True while an id still shows its placeholder (drives the dev label). */
  isPlaceholder(assetId: string): boolean;
}

/**
 * Final art, by asset id. Empty in the placeholder build. Each entry is a
 * static require of the generated file, for example
 * `rc_claude_rug: require('../../../assets/relationship-challenge-claude/final/rc_claude_rug.webp')`.
 */
export const RC_CLAUDE_INSTALLED: Partial<Record<string, ImageSourcePropType>> = {};

export const rcClaudeAssets: RcAssetSource = {
  resolve: (assetId) => RC_CLAUDE_INSTALLED[assetId] ?? RC_CLAUDE_PLACEHOLDERS[assetId],
  isPlaceholder: (assetId) => !RC_CLAUDE_INSTALLED[assetId],
};
