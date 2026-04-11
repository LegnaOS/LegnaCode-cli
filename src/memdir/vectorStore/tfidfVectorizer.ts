/**
 * Pure TypeScript TF-IDF vectorizer with cosine similarity.
 * Zero dependencies. Adapted from mempalace's ChromaDB usage but
 * implemented as a lightweight local alternative.
 *
 * Pipeline: lowercase → split(\W+) → stopword removal → Porter stem → TF-IDF → cosine
 */

// --- Stopwords (English, ~150 common words) ---
const STOPWORDS = new Set([
  'a','an','the','and','or','but','in','on','at','to','for','of','with','by',
  'from','is','it','its','was','are','were','be','been','being','have','has',
  'had','do','does','did','will','would','could','should','may','might','shall',
  'can','this','that','these','those','i','me','my','we','our','you','your',
  'he','him','his','she','her','they','them','their','what','which','who',
  'whom','when','where','why','how','all','each','every','both','few','more',
  'most','other','some','such','no','not','only','own','same','so','than',
  'too','very','just','about','above','after','again','also','am','any','as',
  'because','before','below','between','during','here','if','into','like',
  'new','now','off','once','out','over','own','re','s','t','then','there',
  'through','under','until','up','us','well','while','d','ll','m','o','ve',
])

// --- Porter Stemmer (simplified, ~80 lines) ---
// --- Porter Stemmer (simplified) ---
function porterStem(word: string): string {
  if (word.length < 3) return word
  // Step 1a: sses→ss, ies→i, ss→ss, s→''
  if (word.endsWith('sses')) return word.slice(0, -2)
  if (word.endsWith('ies')) return word.slice(0, -2)
  if (word.endsWith('ss')) return word
  if (word.endsWith('s')) return word.slice(0, -1)
  // Step 1b: eed→ee, ed→'', ing→''
  if (word.endsWith('eed')) return word.slice(0, -1)
  if (word.endsWith('ed') && /[aeiou]/.test(word.slice(0, -2))) return word.slice(0, -2)
  if (word.endsWith('ing') && /[aeiou]/.test(word.slice(0, -3))) return word.slice(0, -3)
  // Step 2: ational→ate, tional→tion, enci→ence, anci→ance, izer→ize
  if (word.endsWith('ational')) return word.slice(0, -5) + 'e'
  if (word.endsWith('tional')) return word.slice(0, -2)
  if (word.endsWith('enci')) return word.slice(0, -1) + 'e'
  if (word.endsWith('anci')) return word.slice(0, -1) + 'e'
  if (word.endsWith('izer')) return word.slice(0, -1)
  if (word.endsWith('ness')) return word.slice(0, -4)
  if (word.endsWith('ment')) return word.slice(0, -4)
  if (word.endsWith('ful')) return word.slice(0, -3)
  if (word.endsWith('ous')) return word.slice(0, -3)
  if (word.endsWith('ive')) return word.slice(0, -3)
  if (word.endsWith('tion')) return word.slice(0, -3) + 'e'
  if (word.endsWith('ly')) return word.slice(0, -2)
  return word
}

// --- Tokenizer ---
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/\W+/)
    .filter(w => w.length > 1 && !STOPWORDS.has(w))
    .map(porterStem)
}

// --- TF-IDF Vector ---
export type TfidfVector = Map<string, number>

/** Compute term frequency for a single document. */
function termFrequency(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>()
  for (const t of tokens) {
    tf.set(t, (tf.get(t) || 0) + 1)
  }
  // Normalize by doc length
  const len = tokens.length || 1
  for (const [k, v] of tf) {
    tf.set(k, v / len)
  }
  return tf
}

/**
 * TF-IDF Vectorizer — builds an IDF model from a corpus,
 * then vectorizes queries against it.
 */
export class TfidfVectorizer {
  /** term → inverse document frequency */
  private idf = new Map<string, number>()
  /** Total documents in corpus */
  private docCount = 0

  /**
   * Fit the IDF model from a corpus of documents.
   * Call once after loading all drawers, or incrementally via addDocument().
   */
  fit(documents: string[]): void {
    this.docCount = documents.length
    const df = new Map<string, number>()
    for (const doc of documents) {
      const uniqueTerms = new Set(tokenize(doc))
      for (const t of uniqueTerms) {
        df.set(t, (df.get(t) || 0) + 1)
      }
    }
    this.idf.clear()
    for (const [term, count] of df) {
      // IDF = log(N / (1 + df)) + 1 (smoothed)
      this.idf.set(term, Math.log(this.docCount / (1 + count)) + 1)
    }
  }

  /**
   * Incrementally add a document to the IDF model.
   * Cheaper than re-fitting the entire corpus.
   */
  addDocument(text: string): void {
    this.docCount++
    const uniqueTerms = new Set(tokenize(text))
    for (const t of uniqueTerms) {
      // Approximate: increment df, recompute idf for this term
      const oldDf = this.docCount > 1
        ? Math.round(this.docCount / (Math.exp((this.idf.get(t) || 1) - 1)))
        : 0
      const newDf = oldDf + 1
      this.idf.set(t, Math.log(this.docCount / (1 + newDf)) + 1)
    }
  }

  /** Vectorize a text string into a TF-IDF sparse vector. */
  vectorize(text: string): TfidfVector {
    const tokens = tokenize(text)
    const tf = termFrequency(tokens)
    const vec: TfidfVector = new Map()
    for (const [term, tfVal] of tf) {
      const idfVal = this.idf.get(term) ?? 1.0
      vec.set(term, tfVal * idfVal)
    }
    return vec
  }

  /** Serialize the IDF model to a JSON-compatible object. */
  serialize(): { docCount: number; idf: [string, number][] } {
    return { docCount: this.docCount, idf: [...this.idf.entries()] }
  }

  /** Restore from serialized form. */
  static deserialize(data: { docCount: number; idf: [string, number][] }): TfidfVectorizer {
    const v = new TfidfVectorizer()
    v.docCount = data.docCount
    v.idf = new Map(data.idf)
    return v
  }
}

/**
 * Cosine similarity between two sparse TF-IDF vectors.
 * Returns 0.0–1.0.
 */
export function cosineSimilarity(a: TfidfVector, b: TfidfVector): number {
  let dot = 0
  let normA = 0
  let normB = 0
  for (const [term, val] of a) {
    normA += val * val
    const bVal = b.get(term)
    if (bVal !== undefined) dot += val * bVal
  }
  for (const [, val] of b) {
    normB += val * val
  }
  if (normA === 0 || normB === 0) return 0
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}

/**
 * Vectorize text to a Float32Array for compact storage.
 * Uses a fixed vocabulary (the IDF keys) for consistent dimensionality.
 */
export function vectorToFloat32(vec: TfidfVector, vocab: string[]): Float32Array {
  const arr = new Float32Array(vocab.length)
  for (let i = 0; i < vocab.length; i++) {
    arr[i] = vec.get(vocab[i]!) ?? 0
  }
  return arr
}

export { tokenize, porterStem }
