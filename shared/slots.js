export const SLOTS = [
  { id: 1, label: 'Morning (fasting)', icon: 'sunrise' },
  { id: 2, label: 'After breakfast', icon: 'coffee' },
  { id: 3, label: 'After lunch', icon: 'sun' },
  { id: 4, label: 'After dinner', icon: 'moon' },
];

export function slotLabel(id) {
  return SLOTS.find((slot) => slot.id === id)?.label;
}
