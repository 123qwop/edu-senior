# Admin role

## Database

Run Alembic migrations so the `admin` role exists:

```bash
cd backend
alembic upgrade head
```

Or insert manually (PostgreSQL):

```sql
INSERT INTO public.role (role_name)
SELECT 'admin'
WHERE NOT EXISTS (SELECT 1 FROM public.role WHERE LOWER(role_name) = 'admin');
```

## Promote a user to admin

Registration **cannot** create admins. After the role row exists, assign it:

```sql
UPDATE public."User"
SET role_id = (SELECT role_id FROM public.role WHERE LOWER(role_name) = 'admin' LIMIT 1)
WHERE LOWER(email) = 'your.email@example.com';
```

Log out and log in again so the JWT and frontend `user_role` refresh.

## API (requires `Authorization` cookie / `access_token`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/users` | List users |
| PATCH | `/admin/users/{id}/role` | Body: `{"role":"student"\|"teacher"\|"admin"}` |
| DELETE | `/admin/users/{id}` | Delete user (not yourself) |
| GET | `/admin/studysets` | List all study sets |
| DELETE | `/admin/studysets/{id}` | Delete study set |
