import type { PilotFrame } from '../data/pilotOptics';
import type { VisitLeadFramePayload } from '../types/backend';

export function toVisitLeadFrames(frames: PilotFrame[], selectedGoal: string, fitScore?: number): VisitLeadFramePayload[] {
  return frames.slice(0, 3).map((frame) => ({
    frameId: frame.id,
    frameName: `${frame.brand} ${frame.model}`,
    frameBrand: frame.brand,
    frameCategory: frame.category,
    frameSize: frame.size,
    framePriceRub: frame.price,
    fitScore,
    useCase: selectedGoal,
  }));
}
