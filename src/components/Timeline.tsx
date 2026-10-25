import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { packLane, timelineRange, zoomToFill } from '../model/layout';
import {
  birthdayPosition, formatMonth, parseDateKey, positionOfDate, seasonOf, splitMonthIndex,
} from '../model/months';
import { PALETTE } from '../model/palette';
import type { LifeItem, TimelineData } from '../model/types';

const LABEL_WIDTH = 176;
const ROW_HEIGHT = 34;
const LANE_PADDING = 8;
export const MIN_PX_PER_MONTH = 3;
export const MAX_PX_PER_MONTH = 120;

interface TimelineProps {
  data: TimelineData;
  nowMonth: number;
  pxPerMonth: number;
  hoverPosition: number | null;
  focusCategoryId: string | null;
  onPxPerMonthChange(pxPerMonth: number): void;
  onMinPxPerMonthChange(minPxPerMonth: number): void;
  onHoverPositionChange(position: number | null): void;
  onItemClick(item: LifeItem): void;
  onCreateItem(categoryId: string, monthIndex: number): void;
  onCategoryRename(categoryId: string, name: string): void;
  onCategoryDelete(categoryId: string): void;
  onCategoryMove(categoryId: string, offset: number): void;
  onCategoryAdd(): void;
}

/**
 * The scrolling timeline: a sticky time axis along the top, a sticky lane label
 * column on the left, and one swimlane per category whose items are stacked into
 * rows wherever they overlap. Dotted lines mark each birthday, a solid line marks
 * today, and a cursor line follows the mouse (reported via `onHoverPositionChange`
 * as a fractional month position, and kept up to date while scrolling under a
 * stationary pointer).
 *
 * The furthest zoom-out shows the whole range across the visible width, so the
 * timeline always fills the window; that minimum is reported through
 * `onMinPxPerMonthChange` whenever the window or the range changes.
 *
 * Scrolling horizontally with a vertical mouse wheel works when there's no vertical
 * overflow, and pinch / ctrl+wheel zooms around the cursor. When the zoom or the
 * start of the range changes, the scroll position is adjusted so the month under
 * the zoom anchor (the cursor, or otherwise the centre of the view) stays put.
 *
 * Lanes are reordered with the arrow buttons in their label, or Alt+↑/↓ while
 * editing a lane's name.
 */
export function Timeline({
  data, nowMonth, pxPerMonth, hoverPosition, focusCategoryId, onPxPerMonthChange, onMinPxPerMonthChange,
  onHoverPositionChange,
  onItemClick, onCreateItem, onCategoryRename, onCategoryDelete, onCategoryMove, onCategoryAdd,
}: TimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const zoomAnchorRef = useRef<{ position: number; viewportX: number } | null>(null);
  const pointerClientXRef = useRef<number | null>(null);
  const pxPerMonthRef = useRef(pxPerMonth);
  pxPerMonthRef.current = pxPerMonth;
  const [viewportWidth, setViewportWidth] = useState(0);

  const range = useMemo(() => timelineRange(data, nowMonth), [data, nowMonth]);
  const rangeStartRef = useRef(range.start);
  rangeStartRef.current = range.start;
  const minPxPerMonth = zoomToFill(viewportWidth - LABEL_WIDTH, range, MIN_PX_PER_MONTH, MAX_PX_PER_MONTH);
  const totalWidth = (range.end - range.start) * pxPerMonth;
  const xOf = (position: number) => (position - range.start) * pxPerMonth;
  const nowPosition = positionOfDate(new Date());

  const lanes = useMemo(
    () => data.categories.map((category) => ({
      category,
      ...packLane(data.items.filter((item) => item.categoryId === category.id), nowMonth),
    })),
    [data, nowMonth],
  );

  const birthdays = useMemo(() => {
    const birthday = data.birthday ? parseDateKey(data.birthday) : null;
    if (!birthday) return [];
    const markers = [];
    for (let year = Math.max(birthday.year, range.start / 12); year < range.end / 12; year++) {
      markers.push({ age: year - birthday.year, position: birthdayPosition(birthday, year) });
    }
    return markers;
  }, [data.birthday, range]);

  useLayoutEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    const observer = new ResizeObserver(() => setViewportWidth(scroller.clientWidth));
    observer.observe(scroller);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (viewportWidth > 0) onMinPxPerMonthChange(minPxPerMonth);
  }, [viewportWidth, minPxPerMonth, onMinPxPerMonthChange]);

  useLayoutEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    const trackViewportWidth = scroller.clientWidth - LABEL_WIDTH;
    const anchor = zoomAnchorRef.current ?? { position: nowPosition, viewportX: trackViewportWidth * 0.75 };
    scroller.scrollLeft = (anchor.position - range.start) * pxPerMonth - anchor.viewportX;
    zoomAnchorRef.current = anchor;
  }, [pxPerMonth, range.start]);

  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    const handleWheel = (event: WheelEvent) => {
      const pixelsPerDeltaUnit = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? 16
        : event.deltaMode === WheelEvent.DOM_DELTA_PAGE ? scroller.clientWidth : 1;
      const deltaY = event.deltaY * pixelsPerDeltaUnit;
      if (event.ctrlKey) {
        event.preventDefault();
        const viewportX = event.clientX - scroller.getBoundingClientRect().left - LABEL_WIDTH;
        zoomAnchorRef.current = {
          position: rangeStartRef.current + (scroller.scrollLeft + viewportX) / pxPerMonthRef.current,
          viewportX,
        };
        const zoomed = pxPerMonthRef.current * Math.exp(-deltaY * 0.01);
        onPxPerMonthChange(Math.min(MAX_PX_PER_MONTH, Math.max(MIN_PX_PER_MONTH, zoomed)));
      } else if (Math.abs(event.deltaY) > Math.abs(event.deltaX) && scroller.scrollHeight <= scroller.clientHeight) {
        event.preventDefault();
        scroller.scrollLeft += deltaY;
      }
    };
    scroller.addEventListener('wheel', handleWheel, { passive: false });
    return () => scroller.removeEventListener('wheel', handleWheel);
  }, [onPxPerMonthChange]);

  /** The timeline position under a pointer, or null when it's over the lane labels. */
  const positionAtClientX = (clientX: number) => {
    const scroller = scrollRef.current;
    if (!scroller) return null;
    const viewportX = clientX - scroller.getBoundingClientRect().left - LABEL_WIDTH;
    return viewportX < 0 ? null : range.start + (scroller.scrollLeft + viewportX) / pxPerMonth;
  };

  const handleScroll = () => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    const viewportX = (scroller.clientWidth - LABEL_WIDTH) / 2;
    zoomAnchorRef.current = { position: range.start + (scroller.scrollLeft + viewportX) / pxPerMonth, viewportX };
    if (pointerClientXRef.current !== null) onHoverPositionChange(positionAtClientX(pointerClientXRef.current));
  };

  const canvasStyle = {
    width: LABEL_WIDTH + totalWidth,
    '--label-width': `${LABEL_WIDTH}px`,
    '--px-per-month': `${pxPerMonth}px`,
  } as CSSProperties;

  return (
    <div className="timeline" ref={scrollRef} onScroll={handleScroll}>
      <div className="timeline-canvas" style={canvasStyle}>
        <div className="timeline-header">
          <div className="timeline-corner" />
          <div className="axis" style={{ width: totalWidth }}>
            <YearRow rangeStart={range.start} rangeEnd={range.end} pxPerMonth={pxPerMonth} />
            <SubdivisionRow rangeStart={range.start} rangeEnd={range.end} pxPerMonth={pxPerMonth} />
            {data.birthday && (
              <div className="axis-row axis-ages">
                {birthdays.map(({ age, position }) => (
                  <span key={age} className="age-marker" style={{ left: xOf(position) }}>
                    {age === 0 ? 'Born' : age}
                  </span>
                ))}
              </div>
            )}
            <div className="today-marker" style={{ left: xOf(nowPosition) }} title="Today" />
          </div>
        </div>

        <div
          className="timeline-body"
          onMouseMove={(event) => {
            pointerClientXRef.current = event.clientX;
            onHoverPositionChange(positionAtClientX(event.clientX));
          }}
          onMouseLeave={() => {
            pointerClientXRef.current = null;
            onHoverPositionChange(null);
          }}
        >
          <div className={`timeline-grid ${pxPerMonth >= 10 ? 'show-months' : ''}`} style={{ width: totalWidth }}>
            {birthdays.map(({ age, position }) => (
              <div key={age} className="birthday-line" style={{ left: xOf(position) }} />
            ))}
            <div className="today-line" style={{ left: xOf(nowPosition) }} />
          </div>

          {lanes.map(({ category, placed, rowCount }, laneIndex) => (
            <div key={category.id} className="lane" style={{ height: rowCount * ROW_HEIGHT + LANE_PADDING * 2 }}>
              <div className="lane-label">
                <input
                  className="lane-name"
                  value={category.name}
                  placeholder="Untitled lane"
                  aria-label="Lane name"
                  autoFocus={category.id === focusCategoryId}
                  onChange={(event) => onCategoryRename(category.id, event.target.value)}
                  onKeyDown={(event) => {
                    if (event.altKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
                      event.preventDefault();
                      onCategoryMove(category.id, event.key === 'ArrowUp' ? -1 : 1);
                    }
                  }}
                />
                <div className="lane-actions">
                  <div className="lane-move">
                    <button
                      className="icon-button"
                      title="Move lane up"
                      disabled={laneIndex === 0}
                      onClick={() => onCategoryMove(category.id, -1)}
                    >
                      ▲
                    </button>
                    <button
                      className="icon-button"
                      title="Move lane down"
                      disabled={laneIndex === lanes.length - 1}
                      onClick={() => onCategoryMove(category.id, 1)}
                    >
                      ▼
                    </button>
                  </div>
                  <button
                    className="icon-button"
                    title={`Add to ${category.name || 'lane'}`}
                    onClick={() => onCreateItem(category.id, nowMonth)}
                  >
                    +
                  </button>
                  <button
                    className="icon-button"
                    title={`Delete ${category.name || 'lane'}`}
                    onClick={() => onCategoryDelete(category.id)}
                  >
                    ×
                  </button>
                </div>
              </div>
              <div
                className="lane-track"
                style={{ width: totalWidth }}
                onDoubleClick={(event) => {
                  const position = positionAtClientX(event.clientX);
                  if (event.target === event.currentTarget && position !== null) {
                    onCreateItem(category.id, Math.floor(position));
                  }
                }}
              >
                {placed.map(({ item, start, end, row }) => {
                  const dates = `${formatMonth(start)} – ${item.end === null ? 'now' : formatMonth(end - 1)}`;
                  return (
                    <button
                      key={item.id}
                      className={`bar ${item.end === null ? 'ongoing' : ''}`}
                      style={{
                        left: xOf(start),
                        width: Math.max(4, (end - start) * pxPerMonth - 2),
                        top: LANE_PADDING + row * ROW_HEIGHT,
                        '--item-color': PALETTE[item.color],
                      } as CSSProperties}
                      title={`${item.label}\n${dates}${item.notes ? `\n\n${item.notes}` : ''}`}
                      onClick={() => onItemClick(item)}
                    >
                      <span className="bar-content">
                        <span className="bar-label">{item.label}</span>
                        <span className="bar-dates">{dates}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="lane lane-add">
            <div className="lane-label">
              <button className="text-button" onClick={onCategoryAdd}>+ Add lane</button>
            </div>
          </div>

          {hoverPosition !== null && <div className="cursor-line" style={{ left: LABEL_WIDTH + xOf(hoverPosition) }} />}
        </div>
      </div>
    </div>
  );
}

interface AxisRowProps {
  rangeStart: number;
  rangeEnd: number;
  pxPerMonth: number;
}

function YearRow({ rangeStart, rangeEnd, pxPerMonth }: AxisRowProps) {
  const years = [];
  for (let monthIndex = rangeStart; monthIndex < rangeEnd; monthIndex += 12) {
    years.push(monthIndex / 12);
  }
  return (
    <div className="axis-row axis-years">
      {years.map((year) => (
        <div
          key={year}
          className="axis-cell"
          style={{ left: (year * 12 - rangeStart) * pxPerMonth, width: 12 * pxPerMonth }}
        >
          {year}
        </div>
      ))}
    </div>
  );
}

/**
 * Months when zoomed in far enough to label them, otherwise seasons. Either way
 * each cell is tinted by its season.
 */
function SubdivisionRow({ rangeStart, rangeEnd, pxPerMonth }: AxisRowProps) {
  const cells: { start: number; length: number; label: string; season: string }[] = [];
  if (pxPerMonth >= 18) {
    for (let monthIndex = rangeStart; monthIndex < rangeEnd; monthIndex++) {
      const label = formatMonth(monthIndex, { includeYear: false });
      cells.push({
        start: monthIndex, length: 1, label: pxPerMonth >= 30 ? label : label[0], season: seasonOf(monthIndex),
      });
    }
  } else {
    for (let monthIndex = rangeStart; monthIndex < rangeEnd; monthIndex++) {
      const season = seasonOf(monthIndex);
      const previous = cells[cells.length - 1];
      if (previous?.season === season) {
        previous.length++;
      } else {
        cells.push({ start: monthIndex, length: 1, label: season, season });
      }
    }
    for (const cell of cells) {
      const width = cell.length * pxPerMonth;
      cell.label = width >= 52 ? cell.label : width >= 26 ? cell.label.slice(0, 3) : '';
    }
  }
  return (
    <div className="axis-row axis-subdivisions">
      {cells.map(({ start, length, label, season }) => (
        <div
          key={start}
          className={`axis-cell season-${season.toLowerCase()} ${splitMonthIndex(start).month === 0 ? 'year-start' : ''}`}
          style={{ left: (start - rangeStart) * pxPerMonth, width: length * pxPerMonth }}
        >
          {label}
        </div>
      ))}
    </div>
  );
}
