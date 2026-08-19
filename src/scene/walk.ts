import type { GroupNode, SceneNode } from './types.js';

export function flattenScene(root: GroupNode): readonly SceneNode[] {
  const output: SceneNode[] = [];

  const visit = (node: SceneNode): void => {
    if (!node.visible) return;
    if (node.type === 'group') {
      const sorted = [...node.children].sort((left, right) => left.zIndex - right.zIndex);
      sorted.forEach(visit);
      return;
    }
    output.push(node);
  };

  visit(root);
  return output;
}

export function countSceneNodes(root: GroupNode): number {
  let count = 1;
  for (const child of root.children) {
    count += child.type === 'group' ? countSceneNodes(child) : 1;
  }
  return count;
}
