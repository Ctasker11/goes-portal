-- Student self-onboarding: create family + seed checklist atomically
-- SECURITY DEFINER bypasses RLS but enforces auth.uid() ownership

create or replace function complete_onboarding(
  p_student_name text,
  p_program program_type
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_family_id uuid;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  -- Reject if profile already linked to a family
  if exists (select 1 from profiles where id = v_user_id and family_id is not null) then
    raise exception 'onboarding already complete';
  end if;

  -- Create family
  insert into families (student_name, program)
  values (p_student_name, p_program)
  returning id into v_family_id;

  -- Link profile
  update profiles
  set family_id = v_family_id, full_name = p_student_name
  where id = v_user_id;

  -- Seed academic checklist (always)
  if p_program in ('academic', 'both') then
    insert into checklist_items (family_id, category, title, description, sort_order) values
      (v_family_id, 'academic_records', 'Expediente académico oficial', 'Notas oficiales de los últimos 3 años, sellado por tu colegio.', 10),
      (v_family_id, 'academic_records', 'Certificado de graduación (si aplica)', 'Documento que acredita finalización de estudios secundarios.', 20),
      (v_family_id, 'standardized_tests', 'SAT o ACT', 'Resultado oficial. Sube el PDF descargado del College Board / ACT.', 30),
      (v_family_id, 'standardized_tests', 'Prueba de inglés (TOEFL / IELTS / Duolingo)', 'Mínimo recomendado: TOEFL 80, IELTS 6.5, Duolingo 105.', 40),
      (v_family_id, 'essays', 'Personal statement', 'Ensayo principal (~650 palabras). En inglés.', 50),
      (v_family_id, 'essays', 'Carta de motivación GOES', 'Por qué quieres estudiar en EE.UU. y qué buscas.', 60);
  end if;

  -- Seed sports checklist (if sports or both)
  if p_program in ('sports', 'both') then
    insert into checklist_items (family_id, category, title, description, sort_order) values
      (v_family_id, 'sports_profile', 'Vídeo de highlights', 'Reel de 3-5 min. Sube como PDF con enlace YouTube/Vimeo (vídeos directos llegan en Fase 2).', 70),
      (v_family_id, 'sports_profile', 'Estadísticas de temporada', 'Resumen de tu rendimiento deportivo último año.', 80),
      (v_family_id, 'sports_profile', 'Carta de recomendación del entrenador', 'Firmada por tu coach actual.', 90),
      (v_family_id, 'sports_profile', 'Currículum deportivo', 'Trayectoria, clubes, premios.', 100);
  end if;

  -- Personal/visa (always)
  insert into checklist_items (family_id, category, title, description, sort_order) values
    (v_family_id, 'personal_visa', 'Pasaporte', 'Foto de la página principal. Vigencia mínima 6 meses tras inicio del curso.', 110),
    (v_family_id, 'personal_visa', 'DNI / NIE', 'Por ambas caras.', 120),
    (v_family_id, 'personal_visa', 'Foto tipo carnet', 'Fondo blanco, formato pasaporte.', 130);

  -- Log
  insert into activity_log (family_id, actor_id, event, payload)
  values (v_family_id, v_user_id, 'onboarding_completed',
          jsonb_build_object('program', p_program, 'student_name', p_student_name));

  return v_family_id;
end;
$$;

grant execute on function complete_onboarding(text, program_type) to authenticated;
