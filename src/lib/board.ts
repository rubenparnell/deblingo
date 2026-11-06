import type { BoardComposition, BoardOption, Difficulty } from "../types/app";

export const DEFAULT_COMPOSITION: BoardComposition = {
  free: 1,
  common: 15,
  rare: 9,
};

function shuffled<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

export function createBoard(
  options: BoardOption[],
  composition: BoardComposition = DEFAULT_COMPOSITION,
) {
  const selected: BoardOption[] = [];
  const selectedIds = new Set<number>();
  const byDifficulty = (difficulty: Difficulty) =>
    shuffled(options.filter((option) => option.difficulty === difficulty));

  for (const difficulty of ["free", "common", "rare"] as Difficulty[]) {
    for (const option of byDifficulty(difficulty).slice(
      0,
      composition[difficulty],
    )) {
      selected.push(option);
      selectedIds.add(option.id);
    }
  }

  if (selected.length < 25) {
    selected.push(
      ...shuffled(
        options.filter((option) => !selectedIds.has(option.id)),
      ).slice(0, 25 - selected.length),
    );
  }
  return shuffled(selected).slice(0, 25);
}

export function getCompletedLines(
  board: BoardOption[],
  markedIds: number[],
) {
  const marked = new Set(markedIds);
  const lines = [
    ...Array.from({ length: 5 }, (_, row) =>
      Array.from({ length: 5 }, (_, column) => row * 5 + column),
    ),
    ...Array.from({ length: 5 }, (_, column) =>
      Array.from({ length: 5 }, (_, row) => row * 5 + column),
    ),
    Array.from({ length: 5 }, (_, index) => index * 6),
    Array.from({ length: 5 }, (_, index) => (index + 1) * 4),
  ];

  return lines.filter((line) =>
    line.every((index) => board[index] && marked.has(board[index].id)),
  ).length;
}
