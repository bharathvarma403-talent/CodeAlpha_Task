/**
 * supabase.js — Central Supabase client for Apex Project Management
 * Loaded as the FIRST script on every page.
 */

// ─── Config ────────────────────────────────────────────────────────────────
const SUPABASE_URL  = 'https://tbpiytosbepqtdnqzgmh.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRicGl5dG9zYmVwcXRkbnF6Z21oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3MTg4NzAsImV4cCI6MjA5MzI5NDg3MH0.q3hzN0YBgfOKqEFVN56z7XHtK0zBGhxzdG7hv32OcVc';

// ─── Load Supabase SDK from CDN ─────────────────────────────────────────────
(function () {
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
  script.onload = () => {
    window._supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON, {
      auth: { persistSession: true, storageKey: 'apex_session' }
    });
    document.dispatchEvent(new Event('supabase:ready'));
  };
  document.head.appendChild(script);
})();

// ─── Auth Helpers ───────────────────────────────────────────────────────────

/** Get current session synchronously after supabase:ready */
async function getSession() {
  const { data } = await window._supabase.auth.getSession();
  return data.session;
}

/** Get current user */
async function getCurrentUser() {
  const { data } = await window._supabase.auth.getUser();
  return data.user;
}

/** Guard: redirect to sign-in if not authenticated */
async function requireAuth(redirectTo = '../auth/sign_in.html') {
  const session = await getSession();
  if (!session) {
    window.location.href = redirectTo;
    return null;
  }
  return session;
}

/** Guard: redirect to dashboard if already authenticated */
async function requireGuest(redirectTo = '../dashboard/index.html') {
  const session = await getSession();
  if (session) window.location.href = redirectTo;
}

/** Sign out and redirect */
async function signOut() {
  await window._supabase.auth.signOut();
  window.location.href = '../auth/sign_in.html';
}

// ─── Edge Function Caller ───────────────────────────────────────────────────

/**
 * Call a Supabase Edge Function with auth token.
 * @param {string} fnName - Function slug e.g. 'create-task'
 * @param {object} body   - JSON body
 */
async function callFunction(fnName, body) {
  const session = await getSession();
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${fnName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token}`,
      'apikey': SUPABASE_ANON,
    },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Edge function error');
  return json;
}

// ─── Realtime Helpers ───────────────────────────────────────────────────────

/**
 * Subscribe to task changes in a project.
 * @param {string} projectId
 * @param {function} onChange - called with (payload)
 * @returns channel — call channel.unsubscribe() to cleanup
 */
function subscribeToTasks(projectId, onChange) {
  const channel = window._supabase
    .channel(`tasks:${projectId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'tasks',
      filter: `project_id=eq.${projectId}`,
    }, onChange)
    .subscribe();
  return channel;
}

/**
 * Subscribe to comments on a task.
 * @param {string} taskId
 * @param {function} onChange
 */
function subscribeToComments(taskId, onChange) {
  const channel = window._supabase
    .channel(`comments:${taskId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'comments',
      filter: `task_id=eq.${taskId}`,
    }, onChange)
    .subscribe();
  return channel;
}

/**
 * Subscribe to activity logs for a workspace.
 * @param {string} taskId
 * @param {function} onChange
 */
function subscribeToActivity(taskId, onChange) {
  const channel = window._supabase
    .channel(`activity:${taskId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'activity_log',
      filter: `task_id=eq.${taskId}`,
    }, onChange)
    .subscribe();
  return channel;
}

// ─── Data Helpers ───────────────────────────────────────────────────────────

/** Fetch tasks for a project with cursor-based pagination */
async function fetchTasks({ projectId, statusId, assigneeId, cursor, limit = 50 }) {
  let q = window._supabase
    .from('tasks')
    .select(`
      id, title, status, priority, position, due_date, created_at, workspace_id, identifier,
      assignee:profiles!assignee_id(id, full_name, avatar_url, display_name),
      task_labels(label:labels(id, name, color)),
      status_ref:project_statuses!status_id(*)
    `)
    .eq('project_id', projectId)
    .is('parent_id', null)
    .eq('is_archived', false)
    .order('sort_order', { ascending: true })
    .limit(limit);

  if (statusId)   q = q.eq('status_id', statusId);
  if (assigneeId) q = q.eq('assignee_id', assigneeId);
  if (cursor)     q = q.gt('created_at', cursor);

  const { data, error } = await q;
  if (error) throw error;
  return data;
}

/** Fetch single task with full detail */
async function fetchTaskDetail(taskId) {
  const { data, error } = await window._supabase
    .from('tasks')
    .select(`
      *,
      assignee:profiles!assignee_id(id, full_name, avatar_url, display_name),
      creator:profiles!created_by(id, full_name, avatar_url, display_name),
      task_labels(label:labels(*)),
      subtasks:tasks!parent_id(id, title, status, priority, sort_order, identifier),
      attachments(*),
      comments(id, content, created_at, user:profiles!user_id(id, full_name, avatar_url, display_name)),
      status_ref:project_statuses!status_id(*)
    `)
    .eq('id', taskId)
    .single();
  if (error) throw error;
  return data;
}

/** Fetch workspaces the current user belongs to */
async function fetchMyWorkspaces() {
  const user = await getCurrentUser();
  const { data, error } = await window._supabase
    .from('workspace_members')
    .select('role, workspace:workspaces(id, name, slug, logo_url)')
    .eq('user_id', user.id);
  if (error) throw error;
  return data.map(d => ({ ...d.workspace, role: d.role }));
}

/** Fetch projects for a workspace */
async function fetchProjects(workspaceId) {
  const { data, error } = await window._supabase
    .from('projects')
    .select('id, name, color, icon, description, archived, created_at')
    .eq('workspace_id', workspaceId)
    .eq('archived', false)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

/** Fetch activity log for an entity */
async function fetchActivity(taskId, limit = 50) {
  const { data, error } = await window._supabase
    .from('activity_log')
    .select(`
      id, action, field, old_value, new_value, created_at,
      actor:profiles!actor_id(id, full_name, avatar_url, display_name)
    `)
    .eq('task_id', taskId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

// ─── Session store (in-memory cache) ───────────────────────────────────────
window.ApexApp = window.ApexApp || {};
window.ApexApp.getSession       = getSession;
window.ApexApp.getCurrentUser   = getCurrentUser;
window.ApexApp.requireAuth      = requireAuth;
window.ApexApp.requireGuest     = requireGuest;
window.ApexApp.signOut          = signOut;
window.ApexApp.callFunction     = callFunction;
window.ApexApp.fetchTasks       = fetchTasks;
window.ApexApp.fetchTaskDetail  = fetchTaskDetail;
window.ApexApp.fetchMyWorkspaces = fetchMyWorkspaces;
window.ApexApp.fetchProjects    = fetchProjects;
window.ApexApp.fetchActivity    = fetchActivity;
window.ApexApp.subscribeToTasks     = subscribeToTasks;
window.ApexApp.subscribeToComments  = subscribeToComments;
window.ApexApp.subscribeToActivity  = subscribeToActivity;
