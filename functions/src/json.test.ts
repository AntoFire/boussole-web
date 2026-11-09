import { describe, expect, it } from 'vitest'
import { extractJson } from './json.js'

describe('extractJson', () => {
  it('lit un JSON nu, balisé, ou entouré de texte', () => {
    expect(extractJson('{"a":1}')).toEqual({ a: 1 })
    expect(extractJson('Voici :\n```json\n{"a":{"b":2}}\n```\nBonne révision')).toEqual({ a: { b: 2 } })
    expect(extractJson('Résultat {"a":[1,2]} fin')).toEqual({ a: [1, 2] })
  })
  it('renvoie undefined pour un JSON cassé ou absent', () => {
    expect(extractJson('pas de json')).toBeUndefined()
    expect(extractJson('{"a":')).toBeUndefined()
  })
})
