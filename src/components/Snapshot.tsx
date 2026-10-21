import type { CSSProperties } from 'react';
import { itemsActiveAt } from '../model/layout';
import { ageAt, formatMonth, parseDateKey, seasonOf } from '../model/months';
import { PALETTE } from '../model/palette';
import type { TimelineData } from '../model/types';

interface SnapshotProps {
  data: TimelineData;
  position: number;
  isToday: boolean;
  nowMonth: number;
}

/**
 * A one-line answer to "what was my life like then?": the month, season and age
 * at `position`, plus whatever was active in each lane at that time.
 */
export function Snapshot({ data, position, isToday, nowMonth }: SnapshotProps) {
  const monthIndex = Math.floor(position);
  const birthday = data.birthday ? parseDateKey(data.birthday) : null;
  const age = birthday ? ageAt(birthday, position) : null;
  const activeItems = itemsActiveAt(data.items, monthIndex, nowMonth);
  const details = [
    seasonOf(monthIndex),
    birthday ? (age === null ? 'Before you were born' : `Age ${age}`) : 'Set your birthday to see ages',
  ];

  return (
    <footer className="snapshot">
      <div className="snapshot-when">
        <span className="snapshot-eyebrow">{isToday ? 'Today' : 'Hovering'}</span>
        <strong>{formatMonth(monthIndex, { short: false })}</strong>
        <span className="snapshot-details">{details.join(' · ')}</span>
      </div>
      <div className="snapshot-lanes">
        {data.categories.map((category) => {
          const laneItems = activeItems.filter((item) => item.categoryId === category.id);
          if (laneItems.length === 0) return null;
          return (
            <div key={category.id} className="snapshot-lane">
              <span className="snapshot-lane-name">{category.name || 'Untitled lane'}</span>
              {laneItems.map((item) => (
                <span key={item.id} className="chip" style={{ '--item-color': PALETTE[item.color] } as CSSProperties}>
                  {item.label}
                </span>
              ))}
            </div>
          );
        })}
      </div>
    </footer>
  );
}
