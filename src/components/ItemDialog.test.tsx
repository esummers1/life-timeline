import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { LifeItem } from '../model/types';
import { ItemDialog } from './ItemDialog';

const categories = [{ id: 'home', name: 'Home' }, { id: 'work', name: 'Work' }];
const newItem: LifeItem = { id: 'new', categoryId: 'home', label: '', start: '2020-03', end: '2020-03', color: 'blue' };
const existingItem: LifeItem = {
  id: 'flat', categoryId: 'home', label: 'Flat', start: '2010-05', end: '2017-06', color: 'teal', notes: 'Top floor',
};

function renderDialog(item: LifeItem, isNew: boolean) {
  const handlers = { onSave: vi.fn(), onDelete: vi.fn(), onClose: vi.fn() };
  render(<ItemDialog item={item} isNew={isNew} categories={categories} {...handlers} />);
  const months = screen.getAllByRole('combobox', { name: 'Month' });
  const years = screen.getAllByRole('spinbutton', { name: 'Year' });
  return { handlers, user: userEvent.setup(), startMonth: months[0], endMonth: months[1], startYear: years[0], endYear: years[1] };
}

const saveButton = () => screen.getByRole('button', { name: 'Save' });

describe('ItemDialog', () => {
  it('requires a label, then saves the item with a trimmed label and no empty notes', async () => {
    const { handlers, user } = renderDialog(newItem, true);
    expect(screen.getByRole('heading', { name: 'Add to timeline' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
    expect(saveButton()).toBeDisabled();

    await user.type(screen.getByLabelText('Label'), '  Flat on Mill Street  ');
    await user.type(screen.getByLabelText('Notes'), '   ');
    await user.click(saveButton());
    expect(handlers.onSave).toHaveBeenCalledWith({ ...newItem, label: 'Flat on Mill Street', notes: undefined });
  });

  it('edits the lane, dates, colour and notes of an existing item', async () => {
    const { handlers, user, startMonth, endYear } = renderDialog(existingItem, false);
    expect(screen.getByRole('heading', { name: 'Edit item' })).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Lane'), 'Work');
    await user.selectOptions(startMonth, 'September');
    await user.clear(endYear);
    await user.type(endYear, '2018');
    await user.click(screen.getByTitle('violet'));
    await user.clear(screen.getByLabelText('Notes'));
    await user.type(screen.getByLabelText('Notes'), 'Garden flat');
    await user.click(saveButton());

    expect(handlers.onSave).toHaveBeenCalledWith({
      ...existingItem, categoryId: 'work', start: '2010-09', end: '2018-06', color: 'violet', notes: 'Garden flat',
    });
  });

  it('only applies a year once all four digits are typed, and restores it on blur', async () => {
    const { user, startYear } = renderDialog(existingItem, false);
    await user.clear(startYear);
    await user.type(startYear, '201');
    await user.tab();
    expect(startYear).toHaveValue(2010);
  });

  it('refuses an end before the start', async () => {
    const { user, endYear } = renderDialog(existingItem, false);
    await user.clear(endYear);
    await user.type(endYear, '2009');
    expect(screen.getByText('The end month is before the start month.')).toBeInTheDocument();
    expect(saveButton()).toBeDisabled();
  });

  it('marks an item as ongoing, and back again', async () => {
    const { handlers, user, endMonth, endYear } = renderDialog(existingItem, false);
    const ongoing = screen.getByLabelText('Ongoing');

    await user.click(ongoing);
    expect(endMonth).toBeDisabled();
    expect(endYear).toBeDisabled();
    await user.click(saveButton());
    expect(handlers.onSave).toHaveBeenLastCalledWith({ ...existingItem, end: null });

    await user.click(ongoing);
    expect(endMonth).toBeEnabled();
    expect(within(endMonth).getByRole('option', { name: 'May' })).toHaveProperty('selected', true);
    expect(endYear).toHaveValue(2010);
  });

  it('deletes an existing item', async () => {
    const { handlers, user } = renderDialog(existingItem, false);
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(handlers.onDelete).toHaveBeenCalledWith('flat');
  });

  it('discards changes on cancel', async () => {
    const { handlers, user } = renderDialog(existingItem, false);
    await user.type(screen.getByLabelText('Label'), ' edited');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(handlers.onClose).toHaveBeenCalledTimes(1);
    expect(handlers.onSave).not.toHaveBeenCalled();
  });

  it('closes on a backdrop click, but not when a press inside ends on the backdrop', () => {
    const { handlers } = renderDialog(existingItem, false);
    const dialog = document.querySelector('dialog')!;

    fireEvent.pointerDown(screen.getByLabelText('Label'));
    fireEvent.click(dialog);
    expect(handlers.onClose).not.toHaveBeenCalled();

    fireEvent.pointerDown(dialog);
    fireEvent.click(dialog);
    expect(handlers.onClose).toHaveBeenCalledTimes(1);
  });
});
