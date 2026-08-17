import classesData from '../data/classes.json';

export function loadClasses() {
  return classesData;
}

export function getClass(classId) {
  const cls = classesData.find((c) => c.id === classId);
  if (!cls) throw new Error(`Unknown class: ${classId}`);
  return cls;
}
