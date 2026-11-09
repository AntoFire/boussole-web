import type { FichePart } from '../../ai/ficheFlow'

/** Affiche une fiche de révision générée (une partie par lot de pages du cours). */
export function FicheView({ parts }: { parts: FichePart[] }) {
  return (
    <div className="fiche-ai">
      {parts.map((p, i) => (
        <section key={i}>
          <div className="eyebrow">Pages {p.pages}</div>
          <h4>{p.fiche.title}</h4>
          {p.fiche.sections.map((s, j) => (
            <div key={j} className="fiche-sec">
              <h5>{s.title}</h5>
              {s.definitions.length > 0 && (
                <dl>
                  {s.definitions.map((d, k) => (
                    <div key={k}>
                      <dt>{d.term}</dt>
                      <dd>{d.definition}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {s.keyPoints.length > 0 && <ul className="fiche">{s.keyPoints.map((k, m) => <li key={m}>{k}</li>)}</ul>}
              {s.formulas.map((f, m) => <div key={m} className="fiche-f mono">{f}</div>)}
              {s.example && <p className="small"><b>Exemple.</b> {s.example}</p>}
            </div>
          ))}
          <p className="fiche-sum small"><b>Résumé.</b> {p.fiche.summary}</p>
        </section>
      ))}
    </div>
  )
}
