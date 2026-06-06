import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminNav from '@/components/admin/AdminNav'
import CreateSurveyForm from '@/components/admin/CreateSurveyForm'
import SurveyManager from '@/components/admin/SurveyManager'

export default async function AdminSurveysPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: surveys } = await supabase
    .from('surveys')
    .select('*, questions(*)')
    .order('created_at', { ascending: false })

  return (
    <div className="flex min-h-screen">
      <AdminNav />
      <main className="flex-1 p-8">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-700">Surveys</h1>
          <p className="text-slate-400 mt-1">Create and manage survey tasks for users.</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Create form */}
          <div className="card">
            <h2 className="font-display text-lg font-700 mb-5">Create New Survey</h2>
            <CreateSurveyForm />
          </div>

          {/* Existing surveys */}
          <div>
            <h2 className="font-display text-lg font-700 mb-4">
              All Surveys <span className="text-slate-500 font-400 text-base">({surveys?.length ?? 0})</span>
            </h2>
            <SurveyManager surveys={surveys ?? []} />
          </div>
        </div>
      </main>
    </div>
  )
}
