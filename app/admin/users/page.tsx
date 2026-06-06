import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminNav from '@/components/admin/AdminNav'
import UserStatusToggle from '@/components/admin/UserStatusToggle'

const PAGE_SIZE = 30

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: { page?: string; q?: string }
}) {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/dashboard')

  const page = Math.max(1, parseInt(searchParams.page ?? '1'))
  const q = searchParams.q?.trim() ?? ''

  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = supabase
    .from('profiles')
    .select('*', { count: 'exact' })
    .eq('role', 'user')
    .order('created_at', { ascending: false })
    .range(from, to)

  if (q) {
    query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%`)
  }

  const { data: users, count } = await query

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  return (
    <div className="flex min-h-screen">
      <AdminNav />

      <main className="flex-1 p-8">
        <h1 className="mb-6 text-3xl font-bold">Users & Payments</h1>

        <form
          method="GET"
          action="/admin/users"
          className="mb-6 flex gap-2"
        >
          <input
            name="q"
            defaultValue={q}
            placeholder="Search users..."
            className="rounded border px-3 py-2"
          />

          <button
            type="submit"
            className="rounded bg-blue-600 px-4 py-2 text-white"
          >
            Search
          </button>
        </form>

        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-3 text-left">User</th>
                <th className="py-3 text-left">Level</th>
                <th className="py-3 text-left">Amount</th>
                <th className="py-3 text-left">Mpesa Code</th>
                <th className="py-3 text-left">Till</th>
                <th className="py-3 text-left">Payment</th>
                <th className="py-3 text-left">Status</th>
                <th className="py-3 text-left">Action</th>
              </tr>
            </thead>

            <tbody>
              {(users || []).map((u: any) => (
                <tr
                  key={u.id}
                  className="border-b border-slate-800"
                >
                  <td className="py-3">
                    <div className="font-medium">
                      {u.full_name || '—'}
                    </div>

                    <div className="text-xs text-slate-500">
                      {u.email}
                    </div>
                  </td>

                  <td className="py-3">
                    {u.payment_level || 1}
                  </td>

                  <td className="py-3">
                    KSh {(u.payment_amount || 0).toLocaleString()}
                  </td>

                  <td className="py-3">
                    <span className="font-mono text-yellow-400">
                      {u.mpesa_code || 'N/A'}
                    </span>
                  </td>

                  <td className="py-3">
                    {u.assigned_till || 'N/A'}
                  </td>

                  <td className="py-3">
                    {u.payment_status === 'approved' ? (
                      <span className="text-green-400">
                        Approved
                      </span>
                    ) : (
                      <span className="text-yellow-400">
                        Pending
                      </span>
                    )}
                  </td>

                  <td className="py-3">
                    {u.status}
                  </td>

                  <td className="py-3">
                    <UserStatusToggle
                      userId={u.id}
                      currentStatus={u.status}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!users?.length && (
            <p className="py-6 text-center text-slate-500">
              No users found
            </p>
          )}

          {totalPages > 1 && (
            <div className="mt-4 text-sm text-slate-500">
              Total Users: {count}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}