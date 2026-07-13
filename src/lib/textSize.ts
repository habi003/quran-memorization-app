import type { TextSize } from '../types/database'

export interface TextSizeScale {
  label: string
  arabic: string
  translit: string
  // A generous min-height for the ayah text block, tuned per font size —
  // keeps the surrounding card from visibly resizing when moving between a
  // short and a long ayah, which otherwise happens as an instant layout
  // snap right alongside the smooth fade/zoom transition and reads as
  // flicker (confirmed: without this, box height jumps immediately on
  // content swap; opacity/scale animate smoothly — the mismatch is the bug).
  minHeight: string
}

export const TEXT_SIZES: Record<TextSize, TextSizeScale> = {
  small: { label: 'Small', arabic: 'text-3xl', translit: 'text-base', minHeight: 'min-h-[150px]' },
  medium: { label: 'Medium', arabic: 'text-4xl', translit: 'text-lg', minHeight: 'min-h-[190px]' },
  large: { label: 'Large', arabic: 'text-5xl', translit: 'text-xl', minHeight: 'min-h-[230px]' },
}

export function getTextSizeScale(size: TextSize | null | undefined): TextSizeScale {
  return TEXT_SIZES[size ?? 'medium'] ?? TEXT_SIZES.medium
}
