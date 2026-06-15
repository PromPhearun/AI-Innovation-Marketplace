import { Idea } from '@/types';

// Simple but robust local token-based similarity engine (Jaccard Similarity + token weights)
export interface SimilarIdeaResult {
  idea: Idea;
  score: number; // percentage (0 - 100)
}

function getTokens(text: string): Set<string> {
  const stopwords = new Set([
    'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'arent', 'as', 'at',
    'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', 'cant', 'cannot', 'could',
    'did', 'didnt', 'do', 'does', 'doesnt', 'doing', 'dont', 'down', 'during', 'each', 'few', 'for', 'from', 'further',
    'had', 'hadnt', 'has', 'hasnt', 'have', 'havent', 'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself',
    'his', 'how', 'i', 'if', 'in', 'into', 'is', 'isnt', 'it', 'its', 'itself', 'more', 'most', 'mustnt', 'my', 'myself',
    'no', 'nor', 'not', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'ought', 'our', 'ours', 'ourselves', 'out',
    'over', 'own', 'same', 'shant', 'she', 'should', 'shouldnt', 'so', 'some', 'such', 'than', 'that', 'the', 'their',
    'theirs', 'them', 'themselves', 'then', 'there', 'theres', 'these', 'they', 'this', 'those', 'through', 'to', 'too',
    'under', 'until', 'up', 'very', 'was', 'wasnt', 'we', 'were', 'werent', 'what', 'when', 'where', 'which', 'while',
    'who', 'whom', 'why', 'with', 'wont', 'would', 'wouldnt', 'you', 'your', 'yours', 'yourself', 'yourselves'
  ]);

  const cleanText = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ');

  const tokens = cleanText.split(' ').filter(token => token.length > 2 && !stopwords.has(token));
  return new Set(tokens);
}

export function calculateSimilarity(
  newTitle: string,
  newDesc: string,
  existingIdeas: Idea[]
): SimilarIdeaResult[] {
  const newTokens = new Set([
    ...Array.from(getTokens(newTitle)),
    ...Array.from(getTokens(newDesc))
  ]);

  if (newTokens.size === 0) return [];

  const results: SimilarIdeaResult[] = [];

  for (const idea of existingIdeas) {
    const ideaTokens = new Set([
      ...Array.from(getTokens(idea.title)),
      ...Array.from(getTokens(idea.description))
    ]);

    if (ideaTokens.size === 0) continue;

    // Calculate Jaccard Similarity: Intersection / Union
    const intersection = new Set(
      Array.from(newTokens).filter(x => ideaTokens.has(x))
    );

    const union = new Set([...Array.from(newTokens), ...Array.from(ideaTokens)]);

    const jaccardScore = intersection.size / union.size;

    // Give higher weight to title match
    const newTitleTokens = getTokens(newTitle);
    const existingTitleTokens = getTokens(idea.title);
    const titleIntersection = Array.from(newTitleTokens).filter(x => existingTitleTokens.has(x));
    const titleMatchBonus = titleIntersection.length > 0 ? 0.25 : 0;

    const finalScore = Math.min(100, Math.round((jaccardScore + titleMatchBonus) * 100));

    // Only return if there is at least some overlap (e.g., score > 15%)
    if (finalScore > 15) {
      results.push({
        idea,
        score: finalScore
      });
    }
  }

  // Sort by score descending
  return results.sort((a, b) => b.score - a.score);
}
