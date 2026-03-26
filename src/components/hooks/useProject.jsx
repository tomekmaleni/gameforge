import { useState, useEffect, createContext, useContext } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

const ProjectContext = createContext(null);

export function ProjectProvider({ projectId, children }) {
  const [user, setUser] = useState(null);
  useEffect(() => { base44.auth.me().then(setUser).catch(() => {}); }, []);

  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => base44.entities.Project.filter({ id: projectId }),
    enabled: !!projectId,
    select: (data) => data?.[0] || null,
  });

  const { data: membership, isLoading: memberLoading } = useQuery({
    queryKey: ['membership', projectId, user?.email],
    queryFn: () => base44.entities.ProjectMember.filter({ project_id: projectId, user_email: user?.email }),
    enabled: !!projectId && !!user?.email,
    select: (data) => data?.[0] || null,
  });

  const role = membership?.role || 'viewer';
  const canEdit = role === 'admin' || role === 'editor';
  const isAdmin = role === 'admin';

  return (
    <ProjectContext.Provider value={{ project, projectId, user, membership, role, canEdit, isAdmin, isLoading: projectLoading || memberLoading }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error('useProject must be used within ProjectProvider');
  return ctx;
}
