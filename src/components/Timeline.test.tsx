import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { parseMonthKey } from '../model/months';
import type { TimelineData } from '../model/types';
import { Timeline } from './Timeline';

const nowMonth = parseMonthKey('2026-10')!;
const LABEL_WIDTH = 176;
const PX_PER_MONTH = 10;

const data: TimelineData = {
  version: 1,
  birthday: '1990-04-12',
  categories: [{ id: 'home', name: 'Home' }, { id: 'work', name: 'Work' }],
  items: [
    { id: 'flat', categoryId: 'home', label: 'Flat', start: '2010-05', end: '2017-06', color: 'teal' },
    { id: 'house', categoryId: 'home', label: 'House', start: '2017-07', end: null, color: 'green' },
    { id: 'job', categoryId: 'work', label: 'Job', start: '2012-01', end: '2019-12', color: 'blue' },
    { id: 'side', categoryId: 'work', label: 'Side project', start: '2015-01', end: '2016-06', color: 'lime' },
  ],
};

function renderTimeline(overrides: Partial<Parameters<typeof Timeline>[0]> = {}) {
  const handlers = {
    onPxPerMonthChange: vi.fn(),
    onMinPxPerMonthChange: vi.fn(),
    onHoverPositionChange: vi.fn(),
    onItemClick: vi.fn(),
    onCreateItem: vi.fn(),
    onCategoryRename: vi.fn(),
    onCategoryDelete: vi.fn(),
    onCategoryMove: vi.fn(),
    onCategoryAdd: vi.fn(),
  };
  const { container } = render(
    <Timeline
      data={data}
      nowMonth={nowMonth}
      pxPerMonth={PX_PER_MONTH}
      hoverPosition={null}
      focusCategoryId={null}
      {...handlers}
      {...overrides}
    />,
  );
  const scroller = container.querySelector<HTMLElement>('.timeline')!;
  const lanes = [...container.querySelectorAll<HTMLElement>('.lane:not(.lane-add)')];
  return { container, scroller, lanes, handlers };
}

const bar = (label: string) => screen.getByRole('button', { name: new RegExp(`^${label}`) });

describe('Timeline', () => {
  it('draws each lane with its items, stacking overlapping items onto extra rows', () => {
    const { lanes } = renderTimeline();
    expect(lanes).toHaveLength(2);
    expect(within(lanes[0]).getByRole('button', { name: /^Flat/ })).toHaveTextContent('May 2010 – Jun 2017');
    expect(within(lanes[0]).getByRole('button', { name: /^House/ })).toHaveTextContent('Jul 2017 – now');

    expect(bar('Flat').style.top).toBe(bar('House').style.top);
    expect(bar('Job').style.top).not.toBe(bar('Side project').style.top);
    expect(parseFloat(lanes[1].style.height)).toBeGreaterThan(parseFloat(lanes[0].style.height));
  });

  it('positions bars by month, including the whole end month', () => {
    renderTimeline();
    const rangeStart = 1990 * 12;
    expect(parseFloat(bar('Flat').style.left)).toBe((parseMonthKey('2010-05')! - rangeStart) * PX_PER_MONTH);
    expect(parseFloat(bar('Flat').style.width)).toBe((7 * 12 + 2) * PX_PER_MONTH - 2);
  });

  it('marks birth and each birthday, and leaves ages out without a birthday', () => {
    const { container } = renderTimeline();
    const ages = [...container.querySelectorAll('.age-marker')].map((marker) => marker.textContent);
    expect(ages[0]).toBe('Born');
    expect(ages).toContain('36');
    expect(container.querySelectorAll('.birthday-line')).toHaveLength(ages.length);

    const withoutBirthday = renderTimeline({ data: { ...data, birthday: null } });
    expect(withoutBirthday.container.querySelector('.axis-ages')).toBeNull();
  });

  it('creates an item at the month under a double-click on an empty part of a lane', () => {
    const { lanes, scroller, handlers } = renderTimeline();
    const track = lanes[1].querySelector('.lane-track')!;
    // As in a real layout, the track starts after the label column; the month must still be measured from the scroller.
    vi.spyOn(track, 'getBoundingClientRect').mockReturnValue(new DOMRect(LABEL_WIDTH, 0, 1000, 50));
    const clientX = LABEL_WIDTH + 55;
    fireEvent.doubleClick(track, { clientX });
    const expectedMonth = 1990 * 12 + Math.floor((scroller.scrollLeft + 55) / PX_PER_MONTH);
    expect(handlers.onCreateItem).toHaveBeenCalledWith('work', expectedMonth);

    fireEvent.doubleClick(bar('Job'), { clientX });
    expect(handlers.onCreateItem).toHaveBeenCalledTimes(1);
  });

  it('reports the hovered position, or null over the lane labels', () => {
    const { container, scroller, handlers } = renderTimeline();
    const body = container.querySelector('.timeline-body')!;
    fireEvent.mouseMove(body, { clientX: LABEL_WIDTH + 25 });
    expect(handlers.onHoverPositionChange).toHaveBeenLastCalledWith(1990 * 12 + (scroller.scrollLeft + 25) / PX_PER_MONTH);
    fireEvent.mouseMove(body, { clientX: 40 });
    expect(handlers.onHoverPositionChange).toHaveBeenLastCalledWith(null);
    fireEvent.mouseLeave(body);
    expect(handlers.onHoverPositionChange).toHaveBeenLastCalledWith(null);
  });

  it('draws the cursor line at the hovered position', () => {
    const { container } = renderTimeline({ hoverPosition: 2000 * 12 });
    const cursor = container.querySelector<HTMLElement>('.cursor-line')!;
    expect(parseFloat(cursor.style.left)).toBe(LABEL_WIDTH + 10 * 12 * PX_PER_MONTH);
  });

  it('opens an item when its bar is clicked', () => {
    const { handlers } = renderTimeline();
    fireEvent.click(bar('House'));
    expect(handlers.onItemClick).toHaveBeenCalledWith(data.items[1]);
  });

  it('renames, reorders, adds to and deletes lanes from the lane label', () => {
    const { lanes, handlers } = renderTimeline();
    const [homeLane, workLane] = lanes.map((lane) => within(lane));

    expect(homeLane.getByTitle('Move lane up')).toBeDisabled();
    expect(workLane.getByTitle('Move lane down')).toBeDisabled();
    fireEvent.click(homeLane.getByTitle('Move lane down'));
    expect(handlers.onCategoryMove).toHaveBeenLastCalledWith('home', 1);

    const workName = workLane.getByLabelText('Lane name');
    fireEvent.keyDown(workName, { key: 'ArrowUp', altKey: true });
    expect(handlers.onCategoryMove).toHaveBeenLastCalledWith('work', -1);
    fireEvent.keyDown(workName, { key: 'ArrowUp' });
    expect(handlers.onCategoryMove).toHaveBeenCalledTimes(2);

    fireEvent.change(workName, { target: { value: 'Career' } });
    expect(handlers.onCategoryRename).toHaveBeenCalledWith('work', 'Career');

    fireEvent.click(workLane.getByTitle('Add to Work'));
    expect(handlers.onCreateItem).toHaveBeenCalledWith('work', nowMonth);
    fireEvent.click(workLane.getByTitle('Delete Work'));
    expect(handlers.onCategoryDelete).toHaveBeenCalledWith('work');
    fireEvent.click(screen.getByRole('button', { name: '+ Add lane' }));
    expect(handlers.onCategoryAdd).toHaveBeenCalled();
  });

  it('labels months when zoomed in and seasons when zoomed out', () => {
    const zoomedIn = renderTimeline({ pxPerMonth: 40 });
    const zoomedInLabels = [...zoomedIn.container.querySelectorAll('.axis-subdivisions .axis-cell')].map((cell) => cell.textContent);
    expect(zoomedInLabels.slice(0, 3)).toEqual(['Jan', 'Feb', 'Mar']);
    zoomedIn.container.remove();

    const zoomedOut = renderTimeline({ pxPerMonth: 10 });
    const zoomedOutLabels = [...zoomedOut.container.querySelectorAll('.axis-subdivisions .axis-cell')].map((cell) => cell.textContent);
    expect(zoomedOutLabels.slice(0, 3)).toEqual(['', 'Spr', 'Sum']);
  });

  it('zooms around the pointer on ctrl+wheel, within the zoom limits', () => {
    const { scroller, handlers } = renderTimeline();
    fireEvent.wheel(scroller, { ctrlKey: true, deltaY: -50, clientX: LABEL_WIDTH + 100 });
    expect(handlers.onPxPerMonthChange).toHaveBeenLastCalledWith(PX_PER_MONTH * Math.exp(0.5));
    fireEvent.wheel(scroller, { ctrlKey: true, deltaY: 10_000 });
    expect(handlers.onPxPerMonthChange).toHaveBeenLastCalledWith(3);
  });
});
