export const normalizeClinicKey = (s?: string | null): string =>
  (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');

export const findClinicProfile = <T extends { name: string }>(
  profiles: T[],
  name?: string | null
): T | undefined => {
  const key = normalizeClinicKey(name);
  if (!key) return undefined;
  return profiles.find(p => normalizeClinicKey(p.name) === key);
};