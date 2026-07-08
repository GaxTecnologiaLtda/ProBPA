# MÓDULO: Atendimentos Individuais
# Foco: C1 (Consultas APS), C2 (Pré-Natal 6 consultas), Triagem e Escuta

QUERY_ATENDIMENTO_INDIVIDUAL = """
SELECT 
    fat.co_fat_cidadao_pec AS id_paciente,
    fat.co_dim_tempo AS data_atendimento,
    cbo.nu_cbo AS cbo,
    prof.no_profissional AS nome_profissional,
    eq.nu_ine AS ine,
    us.nu_cnes AS cnes,
    fat.st_conduta_consulta_agendada AS conduta_agendada,
    dim_tipo_atd.nu_identificador AS tipo_atendimento, -- 2=Agendada Prog, 6=Consulta no dia, etc
    dim_local.nu_identificador AS local_atendimento,   -- 2=UBS, 5=Domicílio
    fat.nu_peso,
    fat.nu_altura,
    fat.nu_pressao_sistolica,
    fat.nu_pressao_diastolica,
    fat.ds_filtro_ciaps AS ciaps_avaliados,
    fat.ds_filtro_cids AS cids_avaliados
FROM tb_fat_atendimento_individual fat
JOIN tb_dim_cbo cbo ON fat.co_dim_cbo_1 = cbo.co_seq_dim_cbo
JOIN tb_dim_profissional prof ON fat.co_dim_profissional_1 = prof.co_seq_dim_profissional
JOIN tb_dim_equipe eq ON fat.co_dim_equipe_1 = eq.co_seq_dim_equipe
JOIN tb_dim_unidade_saude us ON fat.co_dim_unidade_saude_1 = us.co_seq_dim_unidade_saude
LEFT JOIN tb_dim_tipo_atendimento dim_tipo_atd ON fat.co_dim_tipo_atendimento = dim_tipo_atd.co_seq_dim_tipo_atendimento
LEFT JOIN tb_dim_local_atendimento dim_local ON fat.co_dim_local_atendimento = dim_local.co_seq_dim_local_atendimento
WHERE fat.co_dim_tempo >= %(data_inicio)s 
  AND fat.co_dim_tempo <= %(data_fim)s
"""
