export const getUserRole = (): string => {
  try {
    const user = JSON.parse(localStorage.getItem('auth_user') || '{}');
    return user.role || 'qa'; // fallback QA
  } catch {
    return 'qa';
  }
};

export const isPendingForRole = (status: string, role: string): boolean => {
  const filters: Record<string, string[]> = {
    qa: ['Draft', 'Revision-Draft', 'For QA Distribution'],
    department: ['For Department Review', 'For Department Approval'],
    vpaa: ['For VPAA Review', 'For VPAA Approval'],
    president: ['For President Approval']
  };
  return filters[role]?.includes(status) || false;
};

export const isQA = (role: string): boolean => role === 'qa';
