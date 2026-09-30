import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { GOLDEN_WELCOME } from '../../models/scene.model';
import type { FrameState } from '../../../core/interaction/interaction-state';
import { ParticleFxComponent } from './particle-fx.component';

/**
 * jsdom n'expose pas de WebGL : ces tests vérifient la DÉGRADATION
 * GRACIEUSE — le composant ne rend rien et ne casse rien. Les réglages
 * du champ (nombre, teinte, vitesses) sont couverts par particle-field.spec.
 */
describe('ParticleFxComponent — poussière lumineuse', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ParticleFxComponent],
    }).compileComponents();
  });

  function createParticle(
    state: FrameState,
  ): ComponentFixture<ParticleFxComponent> {
    const fixture = TestBed.createComponent(ParticleFxComponent);
    fixture.componentRef.setInput('state', state);
    fixture.componentRef.setInput('intensity', 'ELEGANT');
    fixture.componentRef.setInput('scene', GOLDEN_WELCOME);
    fixture.detectChanges();
    return fixture;
  }

  it('ENGAGED : sans WebGL (environnement de test), aucun canvas et aucune erreur', async () => {
    const fixture = createParticle('ENGAGED');
    // Laisse la fenêtre async se refermer (garde-fou WebGL synchrone ici).
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect((fixture.nativeElement as HTMLElement).querySelector('canvas')).toBeNull();
  });

  it('IDLE : rien ne démarre — le GPU reste au repos', async () => {
    const fixture = createParticle('IDLE');
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect((fixture.nativeElement as HTMLElement).querySelector('canvas')).toBeNull();
  });

  it('départ puis retour : aucun démarrage intempestif après RESET', async () => {
    const fixture = createParticle('RESET');
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect((fixture.nativeElement as HTMLElement).querySelector('canvas')).toBeNull();
  });
});
