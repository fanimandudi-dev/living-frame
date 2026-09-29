import { Routes } from '@angular/router';

/**
 * Trois routes, toutes en lazy loading :
 * - /frame   : le produit vu par le visiteur (kiosque, plein écran, aucune UI) ;
 * - /studio  : configuration de l'organisateur (Phase 4) ;
 * - /preview : simulation de la machine à états sans caméra (Phase 3).
 *
 * '' → /frame : au démarrage, la tablette montre directement l'œuvre (EF-21).
 */
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'frame' },
  {
    path: 'frame',
    title: 'Living Frame',
    loadComponent: () =>
      import('./features/frame/frame.component').then((m) => m.FrameComponent),
  },
  {
    path: 'studio',
    title: 'Studio — Living Frame',
    loadComponent: () =>
      import('./features/studio/studio.component').then((m) => m.StudioComponent),
  },
  {
    path: 'preview',
    title: 'Preview — Living Frame',
    loadComponent: () =>
      import('./features/preview/preview.component').then((m) => m.PreviewComponent),
  },
  { path: '**', redirectTo: 'frame' },
];
