import { HttpsError } from 'firebase-functions/v2/https'

export interface CallerInfo {
  uid?: string
  /** présent quand un jeton App Check valide accompagne l'appel */
  hasAppCheck: boolean
}

/**
 * Vérifie l'appelant côté serveur. Fermé par défaut : sans OWNER_UID configuré, personne n'entre.
 * Le contrôle repose sur l'UID du jeton Firebase, jamais sur une valeur envoyée par le client.
 */
export function assertAllowed(c: CallerInfo, ownerUid: string, enforceAppCheck: boolean): string {
  if (enforceAppCheck && !c.hasAppCheck) throw new HttpsError('failed-precondition', 'App Check requis')
  if (!c.uid) throw new HttpsError('unauthenticated', 'Connexion requise')
  if (!ownerUid) throw new HttpsError('failed-precondition', 'Serveur non configuré (OWNER_UID)')
  if (c.uid !== ownerUid) throw new HttpsError('permission-denied', 'Accès réservé au propriétaire')
  return c.uid
}
