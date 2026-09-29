import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/**
 * Shell applicatif minimal de Living Frame.
 *
 * Rôle unique : héberger le routeur. Aucune navigation globale visible —
 * le mode Frame (kiosque) doit afficher l'œuvre, rien d'autre (EF-01).
 */
@Component({
  imports: [RouterOutlet],
  selector: 'lf-root',
  styleUrl: './app.component.scss',
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {}
