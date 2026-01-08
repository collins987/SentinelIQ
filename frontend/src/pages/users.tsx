import { useState } from 'react';
import { useApiQuery } from '@/hooks/use-api-query';
import { API_ENDPOINTS } from '@/services/api-endpoints';
import { PageLoadingState } from '@/components/loading-state';
import { PageErrorState } from '@/components/error-state';
import { ErrorBoundary } from '@/components/error-boundary';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Plus, 
  RefreshCw,
  AlertTriangle,
  Shield,
  User as UserIcon
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Types
interface User {
  id: string;
  email: string;
  full_name?: string;
  name?: string;
  username?: string;
  role?: string;
  is_active?: boolean;
  active?: boolean;
  created_at?: string;
  last_login?: string;
}

interface UsersResponse {
  users?: User[];
  data?: User[];
  items?: User[];
  total?: number;
  count?: number;
}

// Role badge component
function RoleBadge({ role }: { role: User['role'] }) {
  const variants: Record<User['role'], 'default' | 'secondary' | 'outline'> = {
    admin: 'default',
    analyst: 'secondary',
    viewer: 'outline',
  };

  return (
    <Badge variant={variants[role]} className="gap-1">
      {role === 'admin' && <Shield className="h-3 w-3" />}
      {role.charAt(0).toUpperCase() + role.slice(1)}
    </Badge>
  );
}

// User avatar component
function UserAvatar({ user }: { user: User }) {
  const initials = user.full_name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <Avatar className="h-8 w-8">
      <AvatarImage src={user.avatar_url} alt={user.full_name} />
      <AvatarFallback>{initials}</AvatarFallback>
    </Avatar>
  );
}

// Users content component
function UsersContent() {
  const [page, setPage] = useState(1);
  
  const { 
    data, 
    isLoading, 
    isError, 
    error, 
    refetch 
  } = useApiQuery<UsersResponse>(`/api/v1/users?page=${page}&page_size=10`);

  if (isLoading) {
    return <UsersLoading />;
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Alert variant="destructive" className="max-w-lg">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Failed to Load Users</AlertTitle>
          <AlertDescription className="mt-2">
            <p className="mb-4">{error?.message || 'Unable to load users.'}</p>
            <Button onClick={() => refetch()} variant="outline" size="sm">
              <RefreshCw className="mr-2 h-4 w-4" /> Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const users: User[] = data?.users || data?.data || data?.items || (Array.isArray(data) ? data : []);
  const total = data?.total || data?.count || users.length;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground">
            Manage user accounts and permissions
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add User
          </Button>
        </div>
      </div>

      {/* Users table */}
      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>
            {total} total user{total !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No users found
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => {
                  const displayName = user.full_name || user.name || user.username || user.email;
                  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                  const isActive = user.is_active ?? user.active ?? true;
                  
                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <UserAvatar user={user} />
                          <span className="font-medium">{displayName}</span>
                        </div>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className="gap-1">
                          {user.role === 'admin' && <Shield className="h-3 w-3" />}
                          {user.role || 'user'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={isActive ? 'outline' : 'secondary'}>
                          {isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>{user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Users loading skeleton
function UsersLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-9 w-32" />
      <Card>
        <CardHeader><Skeleton className="h-6 w-24" /></CardHeader>
        <CardContent>
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full mb-2" />)}
        </CardContent>
      </Card>
    </div>
  );
}

// Export wrapped with error boundary
export default function Users() {
  const { data, isLoading, isError, error, refetch } = useApiQuery<UsersResponse>(
    API_ENDPOINTS.USERS.LIST,
    {
      fallbackEndpoints: API_ENDPOINTS.USERS.FALLBACKS,
    }
  );

  if (isLoading) {
    return <UsersLoading />;
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Alert variant="destructive" className="max-w-lg">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Failed to Load Users</AlertTitle>
          <AlertDescription className="mt-2">
            <p className="mb-4">{error?.message || 'Unable to load users.'}</p>
            <Button onClick={() => refetch()} variant="outline" size="sm">
              <RefreshCw className="mr-2 h-4 w-4" /> Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const users: User[] = data?.users || data?.data || data?.items || (Array.isArray(data) ? data : []);
  const total = data?.total || data?.count || users.length;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground">
            Manage user accounts and permissions
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add User
          </Button>
        </div>
      </div>

      {/* Users table */}
      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>
            {total} total user{total !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No users found
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => {
                  const displayName = user.full_name || user.name || user.username || user.email;
                  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                  const isActive = user.is_active ?? user.active ?? true;
                  
                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <UserAvatar user={user} />
                          <span className="font-medium">{displayName}</span>
                        </div>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className="gap-1">
                          {user.role === 'admin' && <Shield className="h-3 w-3" />}
                          {user.role || 'user'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={isActive ? 'outline' : 'secondary'}>
                          {isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>{user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Users loading skeleton
function UsersLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-9 w-32" />
      <Card>
        <CardHeader><Skeleton className="h-6 w-24" /></CardHeader>
        <CardContent>
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full mb-2" />)}
        </CardContent>
      </Card>
    </div>
  );
}

// Export wrapped with error boundary
export default function Users() {
  const { data, isLoading, isError, error, refetch } = useApiQuery<UsersResponse>(
    API_ENDPOINTS.USERS.LIST,
    {
      fallbackEndpoints: API_ENDPOINTS.USERS.FALLBACKS,
    }
  );

  if (isLoading) {
    return <UsersLoading />;
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Alert variant="destructive" className="max-w-lg">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Failed to Load Users</AlertTitle>
          <AlertDescription className="mt-2">
            <p className="mb-4">{error?.message || 'Unable to load users.'}</p>
            <Button onClick={() => refetch()} variant="outline" size="sm">
              <RefreshCw className="mr-2 h-4 w-4" /> Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const users: User[] = data?.users || data?.data || data?.items || (Array.isArray(data) ? data : []);
  const total = data?.total || data?.count || users.length;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground">
            Manage user accounts and permissions
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add User
          </Button>
        </div>
      </div>

      {/* Users table */}
      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>
            {total} total user{total !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No users found
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => {
                  const displayName = user.full_name || user.name || user.username || user.email;
                  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                  const isActive = user.is_active ?? user.active ?? true;
                  
                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <UserAvatar user={user} />
                          <span className="font-medium">{displayName}</span>
                        </div>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className="gap-1">
                          {user.role === 'admin' && <Shield className="h-3 w-3" />}
                          {user.role || 'user'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={isActive ? 'outline' : 'secondary'}>
                          {isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>{user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Users loading skeleton
function UsersLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-9 w-32" />
      <Card>
        <CardHeader><Skeleton className="h-6 w-24" /></CardHeader>
        <CardContent>
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full mb-2" />)}
        </CardContent>
      </Card>
    </div>
  );
}

// Export wrapped with error boundary
export default function Users() {
  const { data, isLoading, isError, error, refetch } = useApiQuery<UsersResponse>(
    API_ENDPOINTS.USERS.LIST,
    {
      fallbackEndpoints: API_ENDPOINTS.USERS.FALLBACKS,
    }
  );

  if (isLoading) {
    return <UsersLoading />;
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Alert variant="destructive" className="max-w-lg">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Failed to Load Users</AlertTitle>
          <AlertDescription className="mt-2">
            <p className="mb-4">{error?.message || 'Unable to load users.'}</p>
            <Button onClick={() => refetch()} variant="outline" size="sm">
              <RefreshCw className="mr-2 h-4 w-4" /> Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const users: User[] = data?.users || data?.data || data?.items || (Array.isArray(data) ? data : []);
  const total = data?.total || data?.count || users.length;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground">
            Manage user accounts and permissions
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add User
          </Button>
        </div>
      </div>

      {/* Users table */}
      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>
            {total} total user{total !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No users found
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => {
                  const displayName = user.full_name || user.name || user.username || user.email;
                  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                  const isActive = user.is_active ?? user.active ?? true;
                  
                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <UserAvatar user={user} />
                          <span className="font-medium">{displayName}</span>
                        </div>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className="gap-1">
                          {user.role === 'admin' && <Shield className="h-3 w-3" />}
                          {user.role || 'user'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={isActive ? 'outline' : 'secondary'}>
                          {isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>{user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Users loading skeleton
function UsersLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-9 w-32" />
      <Card>
        <CardHeader><Skeleton className="h-6 w-24" /></CardHeader>
        <CardContent>
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full mb-2" />)}
        </CardContent>
      </Card>
    </div>
  );
}
