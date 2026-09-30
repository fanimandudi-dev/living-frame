import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  effect,
  inject,
  input,
} from '@angular/core';
import type { Application, Container, Graphics } from 'pixi.js'; // types uniquement
import { particleFieldFor } from '../../../core/animation/particle-field';
import type { ParticleFieldConfig } from '../../../core/animation/particle-field';
import type {
  DistanceLevel,
  FrameState,
} from '../../../core/interaction/interaction-state';
import { GOLDEN_WELCOME } from '../../models/scene.model';
import type { LivingScene, SceneIntensity } from '../../models/scene.model';

/** Une particule de poussière et son état de vie. */
interface Particle {
  g: Container;
  baseX: number;
  y: number;
  phase: number;
  /** Vitesse de son balancement sinusoïdal. */
  swirl: number;
  speedMul: number;
  alphaMul: number;
  life: number;
  lifeMax: number;
}

/** Aléatoire borné. */
function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/**
 * POUSSIÈRE LUMINEUSE (Étape B) — des particules fines qui s'élèvent
 * lentement autour du portrait, teintées par la palette de la scène
 * (or pour Golden Welcome, argent pour Aurora).
 *
 * Implémentation : PixiJS 8, importé DYNAMIQUEMENT — la bibliothèque vit
 * dans un chunk paresseux, hors du bundle initial (et précaché par la PWA).
 * Le canvas GPU ne tourne QUE pendant la présence (ENGAGED/HOLD) ; le
 * ticker est arrêté au repos — la tablette respire.
 *
 * Dégradation gracieuse : sans WebGL (appareil ancien, environnement de
 * test), le composant ne rend rien et ne casse rien — l'œuvre reste
 * pleinement fonctionnelle.
 */
@Component({
  selector: 'lf-particle-fx',
  templateUrl: './particle-fx.component.html',
  styleUrl: './particle-fx.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParticleFxComponent {
  /** État courant de la machine à états. */
  readonly state = input.required<FrameState>();
  /** Dernier niveau de distance observé (inutilisé pour l'instant). */
  readonly distance = input<DistanceLevel | null>(null);
  /** Puissance des effets (nombre de particules). */
  readonly intensity = input<SceneIntensity>('ELEGANT');
  /** Scène jouée — sa palette teinte la poussière. */
  readonly scene = input<LivingScene>(GOLDEN_WELCOME);

  private readonly host: HTMLElement = inject(ElementRef).nativeElement;
  private readonly destroyRef = inject(DestroyRef);

  private app: Application | null = null;
  private particles: Particle[] = [];
  private fieldCfg: ParticleFieldConfig | null = null;
  private started = false;
  private failed = false;
  private destroyed = false;
  private desiredAlive = false;

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.destroyed = true;
      this.app?.destroy(true, { children: true });
      this.app = null;
      this.particles = [];
    });

    effect(() => {
      const alive = this.state() === 'ENGAGED' || this.state() === 'HOLD';
      this.desiredAlive = alive;
      if (alive) {
        void this.ensureStarted();
      } else if (this.app !== null) {
        // Présence terminée : le GPU se repose.
        this.app.ticker.stop();
      }
    });
  }

  /** Démarre l'application PixiJS une fois (chunk paresseux), puis la réveille. */
  private async ensureStarted(): Promise<void> {
    if (this.failed || this.destroyed) {
      return;
    }
    if (this.started) {
      this.app?.ticker.start();
      return;
    }
    // Garde-fou AVANT l'import : sans WebGL, on ne charge même pas PixiJS.
    if (!this.supportsWebGL()) {
      this.failed = true;
      return;
    }
    this.started = true;
    try {
      const { Application, Graphics } = await import('pixi.js');
      const app = new Application();
      await app.init({
        backgroundAlpha: 0,
        resizeTo: this.host,
        antialias: true,
      });
      if (this.destroyed) {
        app.destroy(true, { children: true });
        return;
      }
      this.host.appendChild(app.canvas);
      this.app = app;
      this.spawnParticles(app, Graphics);
      app.ticker.add((ticker) => this.onTick(ticker.deltaMS / 1000));
      if (!this.desiredAlive) {
        app.ticker.stop();
      }
    } catch {
      // WebGL indisponible en cours de route : dégradation silencieuse.
      this.failed = true;
    }
  }

  /** Crée le champ de particules selon l'intensité et la palette de la scène.
   *  `Gfx` : constructeur Graphics reçu de l'appelant (jamais d'import
   *  statique — PixiJS reste dans son chunk paresseux). */
  private spawnParticles(app: Application, Gfx: typeof Graphics): void {
    const cfg = particleFieldFor(this.intensity(), this.scene());
    this.fieldCfg = cfg;
    const width = app.screen.width;
    const height = app.screen.height;
    const tint = Number.parseInt(cfg.tint.replace('#', ''), 16);

    for (let i = 0; i < cfg.count; i++) {
      const radius = cfg.radiusPx * rand(0.6, 1.4);
      const g = new Gfx();
      // Deux cercles superposés : un cœur net dans un halo doux.
      g.circle(0, 0, radius * 2.1).fill({ color: 0xffffff, alpha: 0.16 });
      g.circle(0, 0, radius).fill({ color: 0xffffff, alpha: 0.5 });
      g.blendMode = 'add';
      g.tint = tint;

      const particle: Particle = {
        g,
        baseX: rand(0, width),
        y: rand(0, height),
        phase: rand(0, Math.PI * 2),
        swirl: rand(0.15, 0.5),
        speedMul: rand(0.6, 1.5),
        alphaMul: rand(0.45, 1),
        life: rand(0, 6),
        lifeMax: rand(6, 11),
      };
      g.position.set(particle.baseX, particle.y);
      g.alpha = 0;
      app.stage.addChild(g);
      this.particles.push(particle);
    }
  }

  /** Fait vivre le champ : montée lente, dérive sinusoïdale, enveloppe d'opacité. */
  private onTick(dt: number): void {
    const cfg = this.fieldCfg;
    const app = this.app;
    if (cfg === null || app === null) {
      return;
    }
    const width = app.screen.width;
    const height = app.screen.height;
    const now = performance.now() / 1000;

    for (const p of this.particles) {
      p.life += dt;
      const k = p.life / p.lifeMax;
      // Enveloppe : apparition douce, plein, extinction douce.
      const envelope = k < 0.15 ? k / 0.15 : k > 0.8 ? Math.max(0, (1 - k) / 0.2) : 1;
      p.y += cfg.riseSpeed * p.speedMul * dt;
      const x = p.baseX + Math.sin(p.phase + now * p.swirl) * cfg.driftPx;
      p.g.position.set(x, p.y);
      p.g.alpha = envelope * p.alphaMul;

      // Fin de vie ou sortie d'écran : la poussière renaît en bas.
      if (k >= 1 || p.y < -30) {
        p.y = height + rand(5, 40);
        p.baseX = rand(0, width);
        p.life = 0;
      }
    }
  }

  /** WebGL disponible ? (faux dans les environnements de test et vieux appareils) */
  private supportsWebGL(): boolean {
    try {
      const canvas = document.createElement('canvas');
      return Boolean(
        canvas.getContext('webgl') ?? canvas.getContext('experimental-webgl'),
      );
    } catch {
      return false;
    }
  }
}
