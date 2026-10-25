import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { SAMPLES } from './samples';
import type { TimelineData } from './model/types';

const savedTimeline: TimelineData = {
  version: 1,
  birthday: '1990-04-12',
  categories: [{ id: 'home', name: 'Home' }, { id: 'work', name: 'Work' }],
  items: [
    { id: 'flat', categoryId: 'home', label: 'Flat', start: '2010-05', end: '2017-06', color: 'teal' },
    { id: 'job', categoryId: 'work', label: 'Job', start: '2012-01', end: null, color: 'blue' },
  ],
};

function renderApp(saved?: TimelineData) {
  if (saved) localStorage.setItem('life-timeline:data', JSON.stringify(saved));
  render(<App />);
  return userEvent.setup();
}

const stored = (): TimelineData => JSON.parse(localStorage.getItem('life-timeline:data')!);
const laneNames = () => screen.getAllByLabelText('Lane name').map((input) => (input as HTMLInputElement).value);
const laneFor = (name: string) => screen.getByDisplayValue(name).closest<HTMLElement>('.lane')!;

describe('App', () => {
  it('starts a new timeline with the default lanes and saves it', () => {
    renderApp();
    expect(laneNames()).toEqual(['Home', 'Education', 'Work', 'Relationship']);
    expect(stored().categories.map(({ name }) => name)).toEqual(laneNames());
  });

  it('restores the saved timeline', () => {
    renderApp(savedTimeline);
    expect(laneNames()).toEqual(['Home', 'Work']);
    expect(screen.getByRole('button', { name: /^Flat/ })).toBeInTheDocument();
  });

  it('adds an item from the toolbar, starting in the current month', async () => {
    const user = renderApp(savedTimeline);
    await user.click(screen.getByRole('button', { name: '+ Add item' }));
    const dialog = within(screen.getByRole('dialog'));
    await user.type(dialog.getByLabelText('Label'), 'Evening class');
    await user.selectOptions(dialog.getByLabelText('Lane'), 'Work');
    await user.click(dialog.getByRole('button', { name: 'Save' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(within(laneFor('Work')).getByRole('button', { name: /^Evening class/ })).toHaveTextContent('Oct 2026 – Oct 2026');
    expect(stored().items.find(({ label }) => label === 'Evening class')).toMatchObject({
      categoryId: 'work', start: '2026-10', end: '2026-10',
    });
  });

  it('adds an item from a lane’s + button with a colour not yet used in that lane', async () => {
    const user = renderApp(savedTimeline);
    await user.click(within(laneFor('Home')).getByTitle('Add to Home'));
    expect(within(screen.getByRole('dialog')).getByLabelText('Lane')).toHaveValue('home');
    expect(screen.getByTitle('teal').querySelector('input')).not.toBeChecked();
    expect(screen.getByTitle('amber').querySelector('input')).toBeChecked();
  });

  it('edits and deletes an existing item', async () => {
    const user = renderApp(savedTimeline);
    await user.click(screen.getByRole('button', { name: /^Flat/ }));
    const label = within(screen.getByRole('dialog')).getByLabelText('Label');
    await user.clear(label);
    await user.type(label, 'Flat, Ancoats');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(stored().items.find(({ id }) => id === 'flat')?.label).toBe('Flat, Ancoats');

    await user.click(screen.getByRole('button', { name: /^Flat, Ancoats/ }));
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(screen.queryByRole('button', { name: /^Flat, Ancoats/ })).not.toBeInTheDocument();
    expect(stored().items.map(({ id }) => id)).toEqual(['job']);
  });

  it('adds, renames and reorders lanes', async () => {
    const user = renderApp(savedTimeline);
    await user.click(screen.getByRole('button', { name: '+ Add lane' }));
    const newLaneName = screen.getAllByLabelText('Lane name').at(-1)!;
    expect(newLaneName).toHaveFocus();
    await user.type(newLaneName, 'Car');
    expect(laneNames()).toEqual(['Home', 'Work', 'Car']);

    await user.click(within(laneFor('Car')).getByTitle('Move lane up'));
    expect(laneNames()).toEqual(['Home', 'Car', 'Work']);
    expect(stored().categories.map(({ name }) => name)).toEqual(['Home', 'Car', 'Work']);
  });

  it('deletes an empty lane straight away, and asks before deleting one with items', async () => {
    const user = renderApp({ ...savedTimeline, categories: [...savedTimeline.categories, { id: 'car', name: 'Car' }] });
    const confirm = vi.spyOn(window, 'confirm');

    await user.click(within(laneFor('Car')).getByTitle('Delete Car'));
    expect(confirm).not.toHaveBeenCalled();
    expect(laneNames()).toEqual(['Home', 'Work']);

    confirm.mockReturnValueOnce(false);
    await user.click(within(laneFor('Work')).getByTitle('Delete Work'));
    expect(confirm).toHaveBeenLastCalledWith('Delete "Work" and its 1 item(s)?');
    expect(laneNames()).toEqual(['Home', 'Work']);

    confirm.mockReturnValueOnce(true);
    await user.click(within(laneFor('Work')).getByTitle('Delete Work'));
    expect(laneNames()).toEqual(['Home']);
    expect(stored().items.map(({ id }) => id)).toEqual(['flat']);
  });

  it('sets the birthday, ignoring dates that can’t be a birthday', () => {
    renderApp({ ...savedTimeline, birthday: null });
    expect(screen.getByText(/Set your birthday to see ages/)).toBeInTheDocument();
    const birthday = screen.getByLabelText('Birthday');

    fireEvent.change(birthday, { target: { value: '0001-04-12' } });
    expect(stored().birthday).toBeNull();
    fireEvent.change(birthday, { target: { value: '1990-04-12' } });
    expect(stored().birthday).toBe('1990-04-12');
    expect(screen.getByText('Autumn · Age 36')).toBeInTheDocument();
  });

  it('imports a timeline file, confirming before replacing existing items', async () => {
    const user = renderApp(savedTimeline);
    const imported: TimelineData = {
      version: 1,
      birthday: null,
      categories: [{ id: 'pets', name: 'Pets' }],
      items: [{ id: 'cat', categoryId: 'pets', label: 'Cat', start: '2019-01', end: null, color: 'amber' }],
    };
    const file = new File([JSON.stringify(imported)], 'timeline.json', { type: 'application/json' });

    await user.upload(document.querySelector<HTMLInputElement>('input[type=file]')!, file);
    const dialog = within(await screen.findByRole('dialog', { name: 'Import timeline.json?' }));
    await user.click(dialog.getByRole('button', { name: 'Import' }));
    expect(laneNames()).toEqual(['Pets']);
    expect(stored()).toEqual(imported);
  });

  it('explains why an invalid file can’t be imported, and keeps the current timeline', async () => {
    const user = renderApp(savedTimeline);
    const alert = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const file = new File(['{"hello": "world"}'], 'notes.json', { type: 'application/json' });

    await user.upload(document.querySelector<HTMLInputElement>('input[type=file]')!, file);
    await waitFor(() => expect(alert).toHaveBeenCalledWith(expect.stringMatching(/^Couldn’t import notes\.json: .*version/)));
    expect(laneNames()).toEqual(['Home', 'Work']);
  });

  it('exports the timeline as a dated JSON file', async () => {
    const user = renderApp(savedTimeline);
    let exported: Blob | undefined;
    URL.createObjectURL = vi.fn((blob: Blob) => {
      exported = blob;
      return 'blob:timeline';
    });
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      expect(this.download).toBe('life-timeline-2026-10-21.json');
    });

    await user.click(screen.getByRole('button', { name: 'Export' }));
    expect(click).toHaveBeenCalled();
    expect(JSON.parse(await exported!.text())).toEqual(savedTimeline);
  });

  describe('samples', () => {
    const [homer, luke] = SAMPLES;
    const chooseSample = (user: ReturnType<typeof userEvent.setup>, name: string) =>
      user.selectOptions(screen.getByRole('combobox', { name: 'Try a sample' }), name);
    const sampleLaneNames = (sample: (typeof SAMPLES)[number]) => sample.timeline.categories.map(({ name }) => name);

    function stubDownloads() {
      URL.createObjectURL = vi.fn(() => 'blob:timeline');
      URL.revokeObjectURL = vi.fn();
      return vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    }

    it('loads a sample straight away when there is nothing to lose, and says it is a sample', async () => {
      const user = renderApp();
      await chooseSample(user, 'Homer Simpson');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(laneNames()).toEqual(sampleLaneNames(homer));
      expect(stored()).toEqual(homer.timeline);
      expect(screen.getByRole('status')).toHaveTextContent(`You’re looking at Homer Simpson’s sample timeline. ${homer.note}`);
    });

    it('switches between untouched samples without asking', async () => {
      const user = renderApp(homer.timeline);
      await chooseSample(user, 'Luke Skywalker');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(laneNames()).toEqual(sampleLaneNames(luke));
    });

    it('asks before replacing your own data, offering an export first', async () => {
      const user = renderApp(savedTimeline);
      const download = stubDownloads();

      await chooseSample(user, 'Luke Skywalker');
      let dialog = within(screen.getByRole('dialog', { name: 'Load Luke Skywalker’s timeline?' }));
      expect(dialog.getByText(/including its 2 items/)).toBeInTheDocument();
      await user.click(dialog.getByRole('button', { name: 'Cancel' }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(stored()).toEqual(savedTimeline);

      await chooseSample(user, 'Luke Skywalker');
      dialog = within(screen.getByRole('dialog'));
      await user.click(dialog.getByRole('button', { name: 'Export a copy' }));
      expect(download).toHaveBeenCalledTimes(1);
      expect(dialog.getByRole('button', { name: 'Exported ✓' })).toBeDisabled();
      await user.click(dialog.getByRole('button', { name: 'Load sample' }));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(stored()).toEqual(luke.timeline);
    });

    it('asks before replacing a sample you have edited, since it is now your data', async () => {
      const user = renderApp(homer.timeline);
      await user.click(screen.getByRole('button', { name: /^Mr\. Plow/ }));
      await user.type(within(screen.getByRole('dialog')).getByLabelText('Label'), '!');
      await user.click(screen.getByRole('button', { name: 'Save' }));
      expect(screen.queryByRole('status')).not.toBeInTheDocument();

      await chooseSample(user, 'Luke Skywalker');
      expect(screen.getByRole('dialog', { name: 'Load Luke Skywalker’s timeline?' })).toBeInTheDocument();
    });

    it('clears a sample to start your own timeline', async () => {
      const user = renderApp(homer.timeline);
      await user.click(within(screen.getByRole('status')).getByRole('button', { name: 'Start your own timeline' }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      expect(laneNames()).toEqual(['Home', 'Education', 'Work', 'Relationship']);
      expect(stored()).toMatchObject({ birthday: null, items: [] });
    });

    it('still asks when you have set a birthday but added no items', async () => {
      const user = renderApp({ ...savedTimeline, items: [] });
      await user.click(screen.getByRole('button', { name: 'Start over' }));
      expect(within(screen.getByRole('dialog')).getByText(/^This replaces everything on your timeline, and can’t be undone\./))
        .toBeInTheDocument();
    });

    it('starts over from your own data after confirming', async () => {
      const user = renderApp(savedTimeline);
      await user.click(screen.getByRole('button', { name: 'Start over' }));
      await user.click(within(screen.getByRole('dialog', { name: 'Start a new timeline?' })).getByRole('button', { name: 'Start over' }));
      expect(laneNames()).toEqual(['Home', 'Education', 'Work', 'Relationship']);
      expect(stored().items).toEqual([]);
    });
  });

  it('cycles the theme between automatic, light and dark, and remembers it', async () => {
    const user = renderApp();
    const themeButton = screen.getByRole('button', { name: /Auto/ });

    await user.click(themeButton);
    expect(themeButton).toHaveTextContent('Light');
    expect(document.documentElement.dataset.theme).toBe('light');
    await user.click(themeButton);
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem('life-timeline:theme')).toBe('dark');
    await user.click(themeButton);
    expect(themeButton).toHaveTextContent('Auto');
    expect(document.documentElement.dataset.theme).toBeUndefined();
  });

  it('shows what was going on at the hovered moment', () => {
    renderApp(savedTimeline);
    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByText('October 2026')).toBeInTheDocument();

    document.querySelector<HTMLElement>('.timeline')!.scrollLeft = 0;
    const pxPerMonth = parseFloat(document.querySelector<HTMLElement>('.timeline-canvas')!.style.getPropertyValue('--px-per-month'));
    const monthsIntoTimeline = (2015 - 1990) * 12 + 3;
    fireEvent.mouseMove(document.querySelector('.timeline-body')!, { clientX: 176 + (monthsIntoTimeline + 0.5) * pxPerMonth });
    expect(screen.getByText('Hovering')).toBeInTheDocument();
    expect(screen.getByText('April 2015')).toBeInTheDocument();
    expect(within(document.querySelector('.snapshot')!).getByText('Flat')).toBeInTheDocument();
  });
});
