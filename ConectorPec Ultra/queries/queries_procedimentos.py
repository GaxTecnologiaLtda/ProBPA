# MÓDULO: Procedimentos e Exames Clínicos (SIGTAP)
# Foco: C7-A (Citopatológico), C4 (Diabetes - Pé/HbA1c), C2 (Pré-Natal - Teste Rápido)

QUERY_PROCEDIMENTOS_FATURADOS = """
SELECT 
    fat_proc.co_seq_fat_proced_atend_proced AS id_procedimento,
    fat_proc.co_fat_cidadao_pec AS cns_cpf_paciente,
    fat_proc.co_dim_tempo AS data_procedimento,
    eq.nu_ine AS ine,
    us.nu_cnes AS cnes,
    prof.no_profissional AS nome_profissional,
    cbo.nu_cbo AS cbo,
    dim_proc.co_proced AS codigo_sigtap,
    dim_proc.ds_proced AS descricao_sigtap
FROM tb_fat_proced_atend_proced fat_proc
LEFT JOIN tb_dim_equipe eq ON fat_proc.co_dim_equipe = eq.co_seq_dim_equipe
LEFT JOIN tb_dim_unidade_saude us ON fat_proc.co_dim_unidade_saude = us.co_seq_dim_unidade_saude
LEFT JOIN tb_dim_profissional prof ON fat_proc.co_dim_profissional = prof.co_seq_dim_profissional
LEFT JOIN tb_dim_cbo cbo ON fat_proc.co_dim_cbo = cbo.co_seq_dim_cbo
LEFT JOIN tb_dim_procedimento dim_proc ON fat_proc.co_dim_procedimento = dim_proc.co_seq_dim_procedimento
WHERE fat_proc.co_dim_tempo >= %(data_inicio)s 
  AND fat_proc.co_dim_tempo <= %(data_fim)s
"""
