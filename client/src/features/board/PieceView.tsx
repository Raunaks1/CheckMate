import { memo } from 'react';
import { motion } from 'framer-motion';
import type { PieceColor, PieceType } from './types';
import { Piece } from './Piece';

interface PieceViewProps {
  color: PieceColor;
  type: PieceType;
  slideDx: number;
  slideDy: number;
  dimmed: boolean;
  animKey: string;
}

export const PieceView = memo(function PieceView({
  color,
  type,
  slideDx,
  slideDy,
  dimmed,
  animKey,
}: PieceViewProps) {
  const shouldSlide = slideDx !== 0 || slideDy !== 0;
  return (
    <motion.span
      key={animKey}
      initial={shouldSlide ? { x: `${slideDx * 100}%`, y: `${slideDy * 100}%` } : false}
      animate={{ x: '0%', y: '0%' }}
      transition={{ duration: 0.12, ease: 'linear' }}
      className="pointer-events-none block h-full w-full select-none"
      style={{ opacity: dimmed ? 0.35 : 1 }}
    >
      <Piece color={color} type={type} className="h-full w-full" />
    </motion.span>
  );
});
