import { parseTimeline } from '../model/storage';
import type { TimelineData } from '../model/types';
import arnoldSchwarzenegger from './arnold-schwarzenegger.json';
import homerSimpson from './homer-simpson.json';
import lukeSkywalker from './luke-skywalker.json';

export interface Sample {
  id: string;
  name: string;
  /** A short caveat about the dates, shown while the sample is on screen. */
  note: string;
  timeline: TimelineData;
}

/**
 * Timelines to try the app with. Each is validated with `parseTimeline` when this
 * module loads, so a mistake in a sample file fails loudly rather than quietly.
 */
export const SAMPLES: Sample[] = [
  {
    id: 'homer-simpson',
    name: 'Homer Simpson',
    note: 'Dates follow the early seasons, since the Simpsons’ timeline floats.',
    timeline: parseTimeline(homerSimpson),
  },
  {
    id: 'luke-skywalker',
    name: 'Luke Skywalker',
    note: 'In-universe years, with the Battle of Yavin placed in 1977, when A New Hope came out.',
    timeline: parseTimeline(lukeSkywalker),
  },
  {
    id: 'arnold-schwarzenegger',
    name: 'Arnold Schwarzenegger',
    note: 'Real milestones, with some months approximate.',
    timeline: parseTimeline(arnoldSchwarzenegger),
  },
];

/** The sample that `data` is an untouched copy of, if any. */
export function findUnmodifiedSample(data: TimelineData): Sample | undefined {
  const serialized = JSON.stringify(data);
  return SAMPLES.find((sample) => JSON.stringify(sample.timeline) === serialized);
}
