import { dayDiff } from '../../domain/dates'

export const RULES = [
  'Pas de travail de cours le mardi soir : le cerveau consolide mieux reposé.',
  'Un chapitre à la fois : valide-le avant de passer au suivant.',
  'Tente avant de regarder la solution : l’effort de rappel fait la mémoire.',
  'Dors avant minuit : une nuit complète vaut une heure de révision.',
  'Samedi après-midi et soir : zone perso, sans culpabilité.',
  'Cinq cartes par jour valent mieux que cinquante une fois par semaine.',
  'Une erreur corrigée aujourd’hui est un point gagné à l’examen.',
]
export const ruleOfDay = (day: string): string => RULES[((dayDiff(day, '2026-01-01') % RULES.length) + RULES.length) % RULES.length]
