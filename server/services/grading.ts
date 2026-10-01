// Grade lookup from the school's configurable grade bands (pure — unit tested).

export interface GradeBandLike {
  grade: string
  minScore: number
  maxScore: number
}

export function gradeForScore(score: number, bands: GradeBandLike[]): string | null {
  const rounded = Math.round(score)
  const sorted = [...bands].sort((a, b) => b.minScore - a.minScore)
  return sorted.find(band => rounded >= band.minScore && rounded <= band.maxScore)?.grade
    ?? sorted.find(band => rounded >= band.minScore)?.grade
    ?? null
}
