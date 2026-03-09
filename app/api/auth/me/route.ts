import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

/**
 * GET /api/auth/me
 * Returns the current user from session (single server round-trip).
 * Used by AuthSessionProvider to avoid multiple client round-trips (getSession + getUser + users select).
 */
export async function GET() {
  try {
    const supabase = await createServerClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    const { data: userData, error } = await supabase
      .from('users')
      .select('id, email, name, role, phone, is_active, is_class_teacher, is_subject_teacher, created_at, updated_at')
      .eq('auth_user_id', authUser.id)
      .single();

    if (error || !userData) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    if (!userData.is_active) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    const user = {
      id: userData.id,
      email: userData.email,
      name: userData.name,
      role: userData.role,
      phone: userData.phone ?? undefined,
      isActive: userData.is_active,
      isClassTeacher: userData.is_class_teacher ?? false,
      isSubjectTeacher: userData.is_subject_teacher ?? false,
      createdAt: userData.created_at,
      updatedAt: userData.updated_at,
    };

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Error in GET /api/auth/me:', error);
    return NextResponse.json({ user: null }, { status: 200 });
  }
}
