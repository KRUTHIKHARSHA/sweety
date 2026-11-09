export const SLOTS = [
  { id: 1, label: 'Morning (fasting)', short: 'Morning', icon: 'sunrise' },
  { id: 2, label: 'After breakfast', short: 'Breakfast', icon: 'coffee' },
  { id: 3, label: 'After lunch', short: 'Lunch', icon: 'sun' },
  { id: 4, label: 'After dinner', short: 'Dinner', icon: 'moon' },
];

export function slotLabel(id) {
  return SLOTS.find((slot) => slot.id === id)?.label;
}
