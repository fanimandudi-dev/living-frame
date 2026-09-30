import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { ScenarioEngineService } from '../../core/scenario/scenario-engine.service';
import { ImageRegistryService } from '../../core/storage/image-registry.service';
import { DEFAULT_FRAME_CONFIG } from '../../shared/models/frame-config.model';
import { StudioComponent } from './studio.component';

/** Stub systématique des object URLs (voir image-registry.service.spec.ts). */
function stubObjectUrls(): void {
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: () => `blob:mock-${Math.random().toString(36).slice(2, 8)}`,
  });
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    value: () => undefined,
  });
}

/**
 * Accès de test aux membres protégés (l'accès par crochets contourne la
 * visibilité TS) : l'encapsulation de production reste intacte.
 */
function protectedApi(component: StudioComponent): {
  form: InstanceType<typeof StudioComponent>['form'];
  onImageSelected(which: 'idle' | 'engaged', event: Event): void;
  onParadePhotoSelected(event: Event): void;
  removeParadePhoto(index: number): void;
  identicalFiles(): boolean;
  useDemoArtwork(): void;
  preview(): Promise<void>;
} {
  return component as unknown as {
    form: InstanceType<typeof StudioComponent>['form'];
    onImageSelected(which: 'idle' | 'engaged', event: Event): void;
    onParadePhotoSelected(event: Event): void;
    removeParadePhoto(index: number): void;
    identicalFiles(): boolean;
    useDemoArtwork(): void;
    preview(): Promise<void>;
  };
}

/** Événement change minimal porteur d'un fichier. */
function fileEvent(file: File): Event {
  return { target: { files: [file] } } as unknown as Event;
}

describe('StudioComponent', () => {
  beforeEach(async () => {
    stubObjectUrls();
    await TestBed.configureTestingModule({
      imports: [StudioComponent],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  async function createStudio(): Promise<{
    fixture: import('@angular/core/testing').ComponentFixture<StudioComponent>;
    component: StudioComponent;
    api: ReturnType<typeof protectedApi>;
  }> {
    const fixture = TestBed.createComponent(StudioComponent);
    fixture.detectChanges();
    await fixture.whenStable(); // ngOnInit : load() puis patch du formulaire
    fixture.detectChanges();
    const component = fixture.componentInstance;
    return { fixture, component, api: protectedApi(component) };
  }

  it('initialise le formulaire depuis la configuration par défaut', async () => {
    const { api } = await createStudio();
    expect(api.form.controls.message.value).toBe(DEFAULT_FRAME_CONFIG.scenario.message);
    expect(api.form.controls.engageDelayS.value).toBe(1.2);
    expect(api.form.controls.holdDurationS.value).toBe(5);
  });

  it('TEST-04 (partie 2) — message édité + Enregistrer → configuration active mise à jour', async () => {
    const { fixture } = await createStudio();
    const scenario = TestBed.inject(ScenarioEngineService);

    const input = fixture.nativeElement.querySelector('[data-field="message"]') as HTMLInputElement;
    input.value = 'Bienvenue chez les Martin';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('[data-action="save"]') as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(scenario.config().scenario.message).toBe('Bienvenue chez les Martin');
    expect(scenario.config().scenario.holdDurationMs).toBe(5000); // le reste est intact
  });

  it('les délais modifiés sont convertis en millisecondes à l’enregistrement', async () => {
    const { fixture, api } = await createStudio();
    const scenario = TestBed.inject(ScenarioEngineService);

    api.form.controls.holdDurationS.setValue(12.5);
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('[data-action="save"]') as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(scenario.config().scenario.holdDurationMs).toBe(12500);
  });

  it('EF-13 — message vide + activé : Enregistrer désactivé', async () => {
    const { fixture, api } = await createStudio();
    api.form.controls.message.setValue('');
    api.form.controls.message.markAsTouched();
    fixture.detectChanges();

    const save = fixture.nativeElement.querySelector('[data-action="save"]') as HTMLButtonElement;
    expect(save.disabled).toBe(true);
  });

  it('EF-13 — délai hors bornes : Enregistrer désactivé', async () => {
    const { fixture, api } = await createStudio();
    api.form.controls.engageDelayS.setValue(0);
    fixture.detectChanges();

    expect(
      (fixture.nativeElement.querySelector('[data-action="save"]') as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it('message désactivé → le champ n’est plus requis (formulaire valide même vide)', async () => {
    const { api } = await createStudio();
    api.form.controls.messageEnabled.setValue(false);
    api.form.controls.message.setValue('');
    expect(api.form.valid).toBe(true);
  });

  it('import d’image → référence stockée enregistrée et résolue par le registre', async () => {
    const { component, api } = await createStudio();
    const registry = TestBed.inject(ImageRegistryService);
    const file = new File(['photo'], 'mariages.jpg', { type: 'image/jpeg' });

    api.onImageSelected('idle', fileEvent(file));

    expect(component['artworkState']().idleImage).toEqual({
      source: 'stored',
      key: 'artwork/idle',
    });
    expect(registry.hasStored('artwork/idle')).toBe(true);
  });

  it('avertit quand les deux images importées sont identiques (risque R11)', async () => {
    const { api } = await createStudio();
    const file = new File(['meme'], 'photo.jpg', {
      type: 'image/jpeg',
      lastModified: 123456,
    });

    api.onImageSelected('idle', fileEvent(file));
    api.onImageSelected('engaged', fileEvent(file));

    expect(api.identicalFiles()).toBe(true);
  });

  it('défilé — ajoute puis retire une photo supplémentaire (persistance immédiate)', async () => {
    const { component, api } = await createStudio();
    const scenario = TestBed.inject(ScenarioEngineService);
    const saveImageSpy = vi.spyOn(scenario, 'saveImage').mockResolvedValue(undefined);
    const before = component['artworkState']().engagedImages.length; // 4 (démo)

    api.onParadePhotoSelected(fileEvent(new File(['x'], 'p2.jpg', { type: 'image/jpeg' })));
    await Promise.resolve(); // microtask du void saveImage

    expect(component['artworkState']().engagedImages.length).toBe(before + 1);
    expect(component['artworkState']().engagedImages[before].source).toBe('stored');
    expect(saveImageSpy).toHaveBeenCalled();

    api.removeParadePhoto(1);
    expect(component['artworkState']().engagedImages.length).toBe(before);

    // La photo de transformation (index 0) n'est jamais retirée.
    api.removeParadePhoto(0);
    expect(component['artworkState']().engagedImages.length).toBe(before);
  });

  it('« Utiliser l’œuvre de démonstration » restaure l’œuvre embarquée', async () => {
    const { component, api } = await createStudio();
    api.onImageSelected('idle', fileEvent(new File(['a'], 'a.jpg')));
    expect(component['artworkState']().idleImage.source).toBe('stored');

    api.useDemoArtwork();
    expect(component['artworkState']()).toEqual(DEFAULT_FRAME_CONFIG.artwork);
  });

  it('Prévisualiser enregistre puis navigue vers /frame?demo=1', async () => {
    const { api } = await createStudio();
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    await api.preview();
    expect(navigateSpy).toHaveBeenCalledWith(['/frame'], { queryParams: { demo: 1 } });
  });

  it('EF-14 — l’import d’image persist le fichier (via ScenarioEngine.saveImage)', async () => {
    const { fixture, api } = await createStudio();
    const scenario = TestBed.inject(ScenarioEngineService);
    const saveImageSpy = vi.spyOn(scenario, 'saveImage').mockResolvedValue(undefined);

    const file = new File([new Uint8Array([1, 2])], 'p.jpg', { type: 'image/jpeg' });
    api.onImageSelected('engaged', fileEvent(file));
    await Promise.resolve(); // microtask du void saveImage

    expect(saveImageSpy).toHaveBeenCalledWith('artwork/engaged', file);
    fixture.detectChanges();
  });

  it('affiche l’erreur de persistance quand le stockage échoue', async () => {
    const { fixture } = await createStudio();
    const scenario = TestBed.inject(ScenarioEngineService);
    scenario.persistenceError.set('Enregistrement local impossible');
    fixture.detectChanges();

    const banner = (fixture.nativeElement as HTMLElement).querySelector('.studio__warning');
    expect(banner?.textContent).toContain('Enregistrement local impossible');
  });
});
