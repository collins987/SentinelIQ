import { useState } from 'react';
import { useApiQuery } from '@/hooks/use-api-query';
import { PageLoadingState } from '@/components/loading-state';
import { PageErrorState } from '@/components/error-state';
import { ErrorBoundary } from '@/components/error-boundary';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  MoreHorizontal,
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
  full_name: string;
  role: 'admin' | 'analyst' | 'viewer';
  is_active: boolean;
  created_at: string;
  last_login?: string;
  avatar_url?: string;
}

interface UsersResponse {
  users: User[];
  total: number;
  page: number;
  page_size: number;
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
    return <PageLoadingState message="Loading users..." />;
  }

  if (isError || !data) {
    return (
      <PageErrorState 
        error={error || 'Failed to load users'} 
        onRetry={refetch}
        pageName="users"
      />
    );
  }

  const { users, total } = data;

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
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <UserAvatar user={user} />
                        <span className="font-medium">{user.full_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <RoleBadge role={user.role} />
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.is_active ? 'outline' : 'secondary'}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.last_login 
                        ? new Date(user.last_login).toLocaleDateString() 
                        : 'Never'}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>Edit</DropdownMenuItem>
                          <DropdownMenuItem>Reset Password</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">
                            Deactivate
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Export wrapped with error boundary
export default function Users() {
  return (
    <ErrorBoundary>
      <UsersContent />
    </ErrorBoundary>
  );
}
