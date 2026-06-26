export function calculateScore(correctAnswers: number, bonusPoints = 0) {
  return correctAnswers + bonusPoints;
}

export function calculatePercentage(score: number, totalPoints: number) {
  return Math.round((score / totalPoints) * 100);
}