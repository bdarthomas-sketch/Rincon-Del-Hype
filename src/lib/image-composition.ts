export interface ImageCompositionState {
  scale: number;
  offsetX: number;
  offsetY: number;
  mode: 'fit' | 'cover';
  image_padding: number;
}

export function getImageCompositionStyle(state: ImageCompositionState) {
  switch (state.mode) {
    case 'cover': {
      const hasAdjustments = state.scale !== 1 || state.offsetX !== 0 || state.offsetY !== 0;
      if (!hasAdjustments) {
        return {
          objectFit: 'cover' as const,
          position: 'static' as const,
          transform: 'none',
        };
      }
      return {
        objectFit: 'cover' as const,
        position: 'static' as const,
        transformOrigin: 'center',
        transform: `translate(${state.offsetX}px, ${state.offsetY}px) scale(${state.scale})`,
      };
    }
    case 'fit':
    default: {
      if (state.image_padding > 0) {
        return {
          objectFit: 'contain' as const,
          position: 'static' as const,
          transform: 'none',
          padding: `${state.image_padding}%`,
        };
      }
      return {
        objectFit: 'contain' as const,
        position: 'static' as const,
        transform: 'none',
      };
    }
  }
}
