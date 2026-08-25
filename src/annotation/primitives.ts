import { GraflumeError } from '../core/errors.js';
import type { AnnotationSpec, DecorationTargetSpec } from '../spec/types.js';

export type AnnotationPrimitive = NonNullable<AnnotationSpec['primitive']>;

export interface AnnotationPrimitiveDefinition {
  readonly id: AnnotationPrimitive;
  readonly targetTypes: readonly DecorationTargetSpec['type'][];
  readonly resizable: boolean;
  readonly description: string;
}

const defaultDefinitions: readonly AnnotationPrimitiveDefinition[] = [
  {
    id: 'callout',
    targetTypes: ['datum', 'layer', 'range', 'plot'],
    resizable: true,
    description: 'Collision-aware text bubble with an optional connector.',
  },
  {
    id: 'label',
    targetTypes: ['datum', 'layer', 'range', 'plot'],
    resizable: true,
    description: 'Unboxed data-coordinate text label.',
  },
  {
    id: 'point',
    targetTypes: ['datum', 'plot'],
    resizable: false,
    description: 'Point emphasis marker with an attached label.',
  },
  {
    id: 'rule',
    targetTypes: ['datum', 'layer', 'range', 'plot'],
    resizable: false,
    description: 'Data-coordinate reference rule with an attached label.',
  },
  {
    id: 'band',
    targetTypes: ['layer', 'range', 'plot'],
    resizable: true,
    description: 'Data-coordinate highlighted region with an attached label.',
  },
] as const;

/** Closed, deterministic registry used by portable annotation compilation and authoring. */
export class AnnotationPrimitiveRegistry {
  readonly #definitions = new Map<AnnotationPrimitive, AnnotationPrimitiveDefinition>();

  constructor(definitions: readonly AnnotationPrimitiveDefinition[] = defaultDefinitions) {
    for (const definition of definitions) this.register(definition);
  }

  register(definition: AnnotationPrimitiveDefinition): this {
    if (this.#definitions.has(definition.id)) {
      throw new GraflumeError(
        'INVALID_SPEC',
        `Annotation primitive "${definition.id}" is already registered.`,
      );
    }
    if (definition.targetTypes.length === 0) {
      throw new GraflumeError(
        'INVALID_SPEC',
        `Annotation primitive "${definition.id}" requires at least one target type.`,
      );
    }
    this.#definitions.set(
      definition.id,
      Object.freeze({ ...definition, targetTypes: Object.freeze([...definition.targetTypes]) }),
    );
    return this;
  }

  resolve(id: AnnotationPrimitive): AnnotationPrimitiveDefinition {
    const definition = this.#definitions.get(id);
    if (definition === undefined) {
      throw new GraflumeError('INVALID_SPEC', `Unknown annotation primitive "${id}".`);
    }
    return definition;
  }

  validateTarget(id: AnnotationPrimitive, target: DecorationTargetSpec): void {
    const definition = this.resolve(id);
    if (!definition.targetTypes.includes(target.type)) {
      throw new GraflumeError(
        'INVALID_SPEC',
        `Annotation primitive "${id}" does not support a "${target.type}" target.`,
      );
    }
  }

  catalog(): readonly AnnotationPrimitiveDefinition[] {
    return Object.freeze([...this.#definitions.values()]);
  }
}

export const annotationPrimitiveRegistry = new AnnotationPrimitiveRegistry();
export const annotationPrimitiveCatalog = annotationPrimitiveRegistry.catalog();
