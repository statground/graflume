import type { BaseNode, GroupNode, SceneNode } from './types.js';

export function nodeBase(
  id: string,
  options: Partial<Pick<BaseNode, 'zIndex' | 'opacity' | 'visible' | 'interactive' | 'datum'>> = {},
): BaseNode {
  return {
    id,
    zIndex: options.zIndex ?? 0,
    opacity: options.opacity ?? 1,
    visible: options.visible ?? true,
    ...(options.interactive === undefined ? {} : { interactive: options.interactive }),
    ...(options.datum === undefined ? {} : { datum: options.datum }),
  };
}

export function group(
  id: string,
  children: readonly SceneNode[],
  options: Partial<Pick<GroupNode, 'zIndex' | 'opacity' | 'visible' | 'clip'>> = {},
): GroupNode {
  return {
    type: 'group',
    ...nodeBase(id, options),
    children,
    ...(options.clip === undefined ? {} : { clip: options.clip }),
  };
}
