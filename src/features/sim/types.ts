export type Outcome = 'cat' | 'dog' | 'other'

export type Prediction = {
  testId: string
  probs: { cat: number; dog: number; other: number }
  predicted: Outcome
  correct: boolean
}

export type SimResult = {
  variety: number
  predictions: Prediction[]
  accuracy: number
  correctCount: number
  /** Round-1 hero test image (the black cat). */
  featured: Prediction
}
