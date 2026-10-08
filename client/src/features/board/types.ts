export type FileLetter = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h';
export type RankNumber = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8';
export type Square = `${FileLetter}${RankNumber}`;

export type PieceColor = 'w' | 'b';
export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
export type PromotionPiece = 'q' | 'r' | 'b' | 'n';

export interface BoardPiece {
  type: PieceType;
  color: PieceColor;
}

export interface LegalMove {
  to: Square;
  isCapture: boolean;
  isPromotion: boolean;
}

export type Orientation = 'white' | 'black';
export type BoardTheme = 'classic' | 'wooden' | 'slate';

export interface LastMove {
  from: Square;
  to: Square;
}

export interface BoardProps {
  fen: string;
  orientation?: Orientation;
  onMove?: (from: Square, to: Square, promotion?: PromotionPiece) => void;
  interactive?: boolean;
  lastMove?: LastMove | null;
  legalMovesProvider?: (square: Square) => LegalMove[];
  checkSquare?: Square | null;
  theme?: BoardTheme;
  animationsEnabled?: boolean;
  hintArrow?: LastMove | null;
  coordinates?: 'outside' | 'inside' | 'none';
  fixedWidth?: number;
  /** Full-bleed on mobile (no plate, no rulers, square corners); card chrome on lg+. */
  bleed?: boolean;
}
