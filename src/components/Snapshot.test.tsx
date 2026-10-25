import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { parseMonthKey, positionOfDay } from '../model/months';
import type { TimelineData } from '../model/types';
import { Snapshot } from './Snapshot';

const nowMonth = parseMonthKey('2026-10')!;

const data: TimelineData = {
  version: 1,
  birthday: '1990-04-12',
  categories: [{ id: 'home', name: 'Home' }, { id: 'work', name: 'Work' }, { id: 'car', name: 'Car' }],
  items: [
    { id: 'flat', categoryId: 'home', label: 'Flat', start: '2010-05', end: '2017-06', color: 'teal' },
    { id: 'job', categoryId: 'work', label: 'Job', start: '2012-01', end: null, color: 'blue' },
    { id: 'side', categoryId: 'work', label: 'Side project', start: '2015-01', end: '2016-06', color: 'lime' },
  ],
};

describe('Snapshot', () => {
  it('shows the month, season, age and what was active in each lane', () => {
    render(<Snapshot data={data} position={positionOfDay(2015, 3, 20)} isToday={false} nowMonth={nowMonth} />);
    expect(screen.getByText('Hovering')).toBeInTheDocument();
    expect(screen.getByText('April 2015')).toBeInTheDocument();
    expect(screen.getByText('Spring · Age 25')).toBeInTheDocument();
    expect(screen.getByText('Flat')).toBeInTheDocument();
    expect(screen.getByText('Job')).toBeInTheDocument();
    expect(screen.getByText('Side project')).toBeInTheDocument();
    expect(screen.queryByText('Car')).not.toBeInTheDocument();
  });

  it('labels today and includes ongoing items', () => {
    render(<Snapshot data={data} position={positionOfDay(2026, 9, 21)} isToday nowMonth={nowMonth} />);
    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByText('Autumn · Age 36')).toBeInTheDocument();
    expect(screen.getByText('Job')).toBeInTheDocument();
    expect(screen.queryByText('Flat')).not.toBeInTheDocument();
  });

  it('explains missing ages before birth or without a birthday', () => {
    const { rerender } = render(
      <Snapshot data={data} position={positionOfDay(1989, 0, 1)} isToday={false} nowMonth={nowMonth} />,
    );
    expect(screen.getByText('Winter · Before you were born')).toBeInTheDocument();
    rerender(<Snapshot data={{ ...data, birthday: null }} position={positionOfDay(2015, 6, 1)} isToday={false} nowMonth={nowMonth} />);
    expect(screen.getByText('Summer · Set your birthday to see ages')).toBeInTheDocument();
  });
});
