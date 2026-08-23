import type { LegendLayout } from '../compiler/legend.js';
import type { InspectionViewTransform } from '../renderer/types.js';
import type { NormalizedLegendSpec } from '../spec/types.js';

export interface LegendActions {
  setVisible(id: string, visible: boolean): void;
}

export class LegendController {
  #host: HTMLElement | null = null;
  #surface: HTMLDivElement | null = null;

  sync(
    host: HTMLElement,
    layout: LegendLayout | null,
    spec: false | NormalizedLegendSpec,
    view: InspectionViewTransform,
    actions: LegendActions,
  ): void {
    if (layout === null || spec === false || !spec.interactive) {
      this.destroy();
      return;
    }
    if (this.#host !== host) {
      this.destroy();
      this.#host = host;
      const surface = document.createElement('div');
      surface.dataset.graflumeLegendControls = 'true';
      surface.setAttribute('role', 'group');
      surface.setAttribute('aria-label', spec.title ?? 'Chart legend');
      surface.style.position = 'absolute';
      surface.style.inset = '0';
      surface.style.zIndex = '18';
      surface.style.pointerEvents = 'none';
      surface.style.overflow = 'hidden';
      host.append(surface);
      this.#surface = surface;
    }
    const surface = this.#surface;
    if (surface === null) return;
    const focusedId = (document.activeElement as HTMLElement | null)?.dataset?.graflumeLegendItem;
    surface.setAttribute('aria-label', spec.title ?? 'Chart legend');
    surface.replaceChildren();
    let focusTarget: HTMLButtonElement | null = null;
    for (const entry of layout.entries) {
      if (!entry.toggleable) continue;
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.graflumeLegendItem = entry.id;
      button.setAttribute('aria-pressed', String(entry.visible));
      const action = entry.visible ? spec.labels.hide : spec.labels.show;
      button.setAttribute('aria-label', `${action} ${entry.label}`);
      button.title = `${action} ${entry.label}`;
      button.textContent = entry.label;
      button.style.position = 'absolute';
      button.style.left = `${entry.bounds.x * view.zoom + view.offsetX}px`;
      button.style.top = `${entry.bounds.y * view.zoom + view.offsetY}px`;
      button.style.width = `${Math.max(24, entry.bounds.width * view.zoom)}px`;
      button.style.height = `${Math.max(24, entry.bounds.height * view.zoom)}px`;
      button.style.padding = '0';
      button.style.border = '1px solid transparent';
      button.style.borderRadius = '6px';
      button.style.background = 'transparent';
      button.style.color = 'transparent';
      button.style.fontSize = '1px';
      button.style.cursor = 'pointer';
      button.style.pointerEvents = 'auto';
      button.addEventListener('pointerenter', () => {
        button.style.background = 'rgba(79,70,229,.08)';
      });
      button.addEventListener('pointerleave', () => {
        button.style.background = 'transparent';
      });
      button.addEventListener('focus', () => {
        button.style.outline = '2px solid #4f46e5';
        button.style.outlineOffset = '1px';
      });
      button.addEventListener('blur', () => {
        button.style.outline = 'none';
      });
      button.addEventListener('click', () => actions.setVisible(entry.id, !entry.visible));
      surface.append(button);
      if (entry.id === focusedId) focusTarget = button;
    }
    focusTarget?.focus();
  }

  destroy(): void {
    this.#surface?.remove();
    this.#surface = null;
    this.#host = null;
  }
}
