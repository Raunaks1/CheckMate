import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { BoardTheme } from '@/features/board';
import type { PieceSetId } from '@/features/board/pieceSet';
import { DEFAULT_PIECE_SET_ID } from '@/features/board/pieceSet';

interface SettingsState {
  boardTheme: BoardTheme;
  pieceSetId: PieceSetId;
  animationsEnabled: boolean;
  soundEnabled: boolean;
  showLegalMoves: boolean;
  showEvalBar: boolean;
  setBoardTheme: (theme: BoardTheme) => void;
  setPieceSetId: (id: PieceSetId) => void;
  setAnimationsEnabled: (on: boolean) => void;
  setSoundEnabled: (on: boolean) => void;
  setShowLegalMoves: (on: boolean) => void;
  setShowEvalBar: (on: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      boardTheme: 'classic',
      pieceSetId: DEFAULT_PIECE_SET_ID,
      animationsEnabled: true,
      soundEnabled: true,
      showLegalMoves: true,
      showEvalBar: true,
      setBoardTheme: (boardTheme) => set({ boardTheme }),
      setPieceSetId: (pieceSetId) => set({ pieceSetId }),
      setAnimationsEnabled: (animationsEnabled) => set({ animationsEnabled }),
      setSoundEnabled: (soundEnabled) => set({ soundEnabled }),
      setShowLegalMoves: (showLegalMoves) => set({ showLegalMoves }),
      setShowEvalBar: (showEvalBar) => set({ showEvalBar }),
    }),
    { name: 'checkmate-settings' }
  )
);
