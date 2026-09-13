export function cleanMemoryMetadata(input = {}) {
  const title = String(input.title || '').trim().slice(0, 100);
  const description = String(input.description || '').trim().slice(0, 1600);
  const date = String(input.date || '').trim();
  if (!title) throw new Error('Please give this memory a title.');
  const parsed = new Date(date + 'T12:00:00Z');
  if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date)) throw new Error('Choose a valid date or leave it blank.');
  return {title, description, date};
}
export function formatMemoryDate(value) {
  if (!value) return '';
  const date = new Date(value + 'T12:00:00');
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-GB', {day:'numeric', month:'long', year:'numeric'});
}
