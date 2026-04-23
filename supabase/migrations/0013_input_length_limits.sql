-- Cap user-provided string lengths at the DB layer so a malicious client
-- cannot bloat a row with megabytes of text (cheap to post, expensive to
-- store, index, and serialize on read).

-- Comments: 5000 chars is ~1000 words, plenty for an advisor note.
alter table comments
  add constraint comments_body_len_ck
  check (char_length(body) <= 5000);

-- Families.student_name: passports max at ~100 chars; 255 is generous.
alter table families
  add constraint families_student_name_len_ck
  check (char_length(student_name) <= 255);

-- Profiles.full_name: same cap.
alter table profiles
  add constraint profiles_full_name_len_ck
  check (full_name is null or char_length(full_name) <= 255);

-- Tighten complete_onboarding to reject oversize input before it hits the
-- constraint (friendlier error, no half-created family row on failure since
-- the whole function is one transaction).
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
  v_trimmed text := trim(coalesce(p_student_name, ''));
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  if char_length(v_trimmed) < 2 then
    raise exception 'student name too short';
  end if;
  if char_length(v_trimmed) > 255 then
    raise exception 'student name too long';
  end if;

  if exists (select 1 from profiles where id = v_user_id and family_id is not null) then
    raise exception 'onboarding already complete';
  end if;

  insert into families (student_name, program)
  values (v_trimmed, p_program)
  returning id into v_family_id;

  update profiles
  set family_id = v_family_id, full_name = v_trimmed
  where id = v_user_id;

  if p_program in ('academic', 'both') then
    insert into checklist_items (family_id, category, title, description, sort_order) values
      (v_family_id, 'academic_records', 'Expediente académico oficial', 'Notas oficiales de los últimos 3 años, sellado por tu colegio.', 10),
      (v_family_id, 'academic_records', 'Certificado de graduación (si aplica)', 'Documento que acredita finalización de estudios secundarios.', 20),
      (v_family_id, 'standardized_tests', 'SAT o ACT', 'Resultado oficial. Sube el PDF descargado del College Board / ACT.', 30),
      (v_family_id, 'standardized_tests', 'Prueba de inglés (TOEFL / IELTS / Duolingo)', 'Mínimo recomendado: TOEFL 80, IELTS 6.5, Duolingo 105.', 40),
      (v_family_id, 'essays', 'Personal statement', 'Ensayo principal (~650 palabras). En inglés.', 50),
      (v_family_id, 'essays', 'Carta de motivación GOES', 'Por qué quieres estudiar en EE.UU. y qué buscas.', 60);
  end if;

  if p_program in ('sports', 'both') then
    insert into checklist_items (family_id, category, title, description, sort_order) values
      (v_family_id, 'sports_profile', 'Vídeo de highlights', 'Reel de 3-5 min. Sube como PDF con enlace YouTube/Vimeo (vídeos directos llegan en Fase 2).', 70),
      (v_family_id, 'sports_profile', 'Estadísticas de temporada', 'Resumen de tu rendimiento deportivo último año.', 80),
      (v_family_id, 'sports_profile', 'Carta de recomendación del entrenador', 'Firmada por tu coach actual.', 90),
      (v_family_id, 'sports_profile', 'Currículum deportivo', 'Trayectoria, clubes, premios.', 100);
  end if;

  insert into checklist_items (family_id, category, title, description, sort_order) values
    (v_family_id, 'personal_visa', 'Pasaporte', 'Foto de la página principal. Vigencia mínima 6 meses tras inicio del curso.', 110),
    (v_family_id, 'personal_visa', 'DNI / NIE', 'Por ambas caras.', 120),
    (v_family_id, 'personal_visa', 'Foto tipo carnet', 'Fondo blanco, formato pasaporte.', 130);

  insert into activity_log (family_id, actor_id, event, payload)
  values (v_family_id, v_user_id, 'onboarding_completed',
          jsonb_build_object('program', p_program, 'student_name', v_trimmed));

  return v_family_id;
end;
$$;

grant execute on function complete_onboarding(text, program_type) to authenticated;
